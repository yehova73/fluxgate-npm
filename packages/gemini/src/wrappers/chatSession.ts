import type {
  ChatSession,
  GenerateContentResult,
  GenerateContentStreamResult,
} from "@google/generative-ai";
import { AiEventMetadata, WithTracking, FluxGate } from "@fluxgate/sdk";
import type { WithStreamTracking } from "../types/types.js";
import {
  extractGeminiUsage,
  extractGeminiUsageFromChunk,
} from "../utils/extractUsage.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";
import { TrackedStream } from "./TrackedStream.js";

type OrigSendMessage = ChatSession["sendMessage"];
type OrigSendMessageStream = ChatSession["sendMessageStream"];

export function createSendMessageWrapper(
  original: OrigSendMessage,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedSendMessage(
    request: Parameters<OrigSendMessage>[0],
  ): Promise<WithTracking<GenerateContentResult>> {
    const start = performance.now();

    let result: GenerateContentResult;
    try {
      result = await original(request);
    } catch (err) {
      await recordUsage({
        instance,
        model: modelName,
        latencyMs: performance.now() - start,
        streaming: false,
        context,
        usage: extractGeminiUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    const candidate = result.response?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const finishMessage = candidate?.finishMessage;
    const status = finishReasonToStatus(finishReason);

    let errorMessage: string | undefined;
    if (status !== "SUCCESS" && finishMessage) {
      errorMessage = `${finishReason}: ${finishMessage}`;
    }

    const fluxGateCostTrackingResponse = await recordUsage({
      instance: instance,
      model: modelName,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractGeminiUsage(result),
      status,
      errorMessage,
    });

    return Object.assign(result, { fluxGateCostTrackingResponse });
  };
}

export function createSendMessageStreamWrapper(
  original: OrigSendMessageStream,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedSendMessageStream(
    request: Parameters<OrigSendMessageStream>[0],
  ): Promise<WithStreamTracking<GenerateContentStreamResult>> {
    const start = performance.now();

    let result: GenerateContentStreamResult;
    try {
      result = await original(request);
    } catch (err) {
      await recordUsage({
        instance,
        model: modelName,
        latencyMs: performance.now() - start,
        streaming: true,
        context,
        usage: extractGeminiUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    const trackedStream = new TrackedStream(
      result.stream,
      async (lastChunk, streamError) => {
        const candidate = lastChunk?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const finishMessage = candidate?.finishMessage;
        const status = streamError
          ? "ERROR"
          : finishReasonToStatus(finishReason);

        let errorMessage: string | undefined;
        if (streamError) {
          errorMessage = streamError.message;
        } else if (status !== "SUCCESS" && finishMessage) {
          errorMessage = `${finishReason}: ${finishMessage}`;
        }

        return recordUsage({
          instance,
          model: modelName,
          latencyMs: performance.now() - start,
          streaming: true,
          context,
          usage: extractGeminiUsageFromChunk(lastChunk),
          status,
          errorMessage,
        });
      },
    );

    // Create result object that exposes fluxGateCostTrackingResponse from the stream
    const streamResult: WithStreamTracking<GenerateContentStreamResult> = {
      response: result.response,
      // TrackedStream implements AsyncIterable but not full AsyncGenerator
      stream: trackedStream as unknown as GenerateContentStreamResult["stream"],
      // Available after stream is fully consumed
      get fluxGateCostTrackingResponse() {
        return trackedStream.fluxGateCostTrackingResponse;
      },
    };

    return streamResult;
  };
}

export interface TrackedChatSession extends ChatSession {
  sendMessage(
    request: Parameters<OrigSendMessage>[0],
  ): Promise<WithTracking<GenerateContentResult>>;

  sendMessageStream(
    request: Parameters<OrigSendMessageStream>[0],
  ): Promise<WithStreamTracking<GenerateContentStreamResult>>;

  withTracking(context: AiEventMetadata): TrackedChatSession;
}

export function wrapChatSession(
  session: ChatSession,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
): TrackedChatSession {
  const trackedSession = Object.create(session) as TrackedChatSession;

  trackedSession.sendMessage = createSendMessageWrapper(
    session.sendMessage.bind(session),
    instance,
    modelName,
    context,
  ) as TrackedChatSession["sendMessage"];

  trackedSession.sendMessageStream = createSendMessageStreamWrapper(
    session.sendMessageStream.bind(session),
    instance,
    modelName,
    context,
  ) as TrackedChatSession["sendMessageStream"];

  trackedSession.withTracking = (newContext: AiEventMetadata) => {
    const mergedContext = context ? { ...context, ...newContext } : newContext;
    return wrapChatSession(session, instance, modelName, mergedContext);
  };

  return trackedSession;
}
