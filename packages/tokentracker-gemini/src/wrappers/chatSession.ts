import { Tracker } from "@llmwatch/tokentracker";
import type {
  ChatSession,
  GenerateContentResult,
  GenerateContentStreamResult,
} from "@google/generative-ai";
import { AiEventMetadata, WithTracking } from "@llmwatch/tokentracker";
import { extractGeminiUsage } from "../utils/extractUsage.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";
import { TrackedStream } from "./TrackedStream.js";

type OrigSendMessage = ChatSession["sendMessage"];
type OrigSendMessageStream = ChatSession["sendMessageStream"];

function extractStreamUsage(lastChunk: any) {
  if (!lastChunk?.usageMetadata) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  const usage = lastChunk.usageMetadata;
  return {
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    cachedTokens: usage.cachedContentTokenCount ?? 0,
    totalTokens: usage.totalTokenCount ?? 0,
  };
}

export function createSendMessageWrapper(
  original: OrigSendMessage,
  tracker: Tracker,
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
        tracker,
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

    const trackLlmResponse = await recordUsage({
      tracker,
      model: modelName,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractGeminiUsage(result),
      status,
      errorMessage,
    });

    return Object.assign(result, { trackLlmResponse });
  };
}

export function createSendMessageStreamWrapper(
  original: OrigSendMessageStream,
  tracker: Tracker,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedSendMessageStream(
    request: Parameters<OrigSendMessageStream>[0],
  ): Promise<WithTracking<GenerateContentStreamResult>> {
    const start = performance.now();

    let result: GenerateContentStreamResult;
    try {
      result = await original(request);
    } catch (err) {
      await recordUsage({
        tracker,
        model: modelName,
        latencyMs: performance.now() - start,
        streaming: true,
        context,
        usage: extractStreamUsage(undefined),
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
          tracker,
          model: modelName,
          latencyMs: performance.now() - start,
          streaming: true,
          context,
          usage: extractStreamUsage(lastChunk),
          status,
          errorMessage,
        });
      },
    );

    // Create result object that exposes trackLlmResponse from the stream
    const streamResult: WithTracking<GenerateContentStreamResult> = {
      response: result.response,
      // TrackedStream implements AsyncIterable but not full AsyncGenerator
      stream: trackedStream as any,
      // Proxy to get trackLlmResponse from stream after completion
      get trackLlmResponse() {
        return trackedStream.trackLlmResponse!;
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
  ): Promise<WithTracking<GenerateContentStreamResult>>;

  withTracking(context: AiEventMetadata): TrackedChatSession;
  __originalMethods?: {
    sendMessage: OrigSendMessage;
    sendMessageStream: OrigSendMessageStream;
  };
}

export function wrapChatSession(
  session: ChatSession,
  tracker: Tracker,
  modelName: string,
  context: AiEventMetadata | undefined,
): TrackedChatSession {
  const trackedSession = session as TrackedChatSession;

  if (!trackedSession.__originalMethods) {
    trackedSession.__originalMethods = {
      sendMessage: session.sendMessage.bind(session),
      sendMessageStream: session.sendMessageStream.bind(session),
    };
  }

  trackedSession.sendMessage = createSendMessageWrapper(
    trackedSession.__originalMethods.sendMessage,
    tracker,
    modelName,
    context,
  ) as TrackedChatSession["sendMessage"];

  trackedSession.sendMessageStream = createSendMessageStreamWrapper(
    trackedSession.__originalMethods.sendMessageStream,
    tracker,
    modelName,
    context,
  ) as TrackedChatSession["sendMessageStream"];

  trackedSession.withTracking = (newContext: AiEventMetadata) => {
    // Merge contexts: newContext overrides existing context properties
    const mergedContext = context ? { ...context, ...newContext } : newContext;
    return wrapChatSession(session, tracker, modelName, mergedContext);
  };

  return trackedSession;
}
