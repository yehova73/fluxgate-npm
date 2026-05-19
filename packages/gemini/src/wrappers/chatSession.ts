import type {
  Chat,
  GenerateContentResponse,
  SendMessageParameters,
  Content,
} from "@google/genai";
import { WithTracking, FluxGate } from "@fluxgate/sdk";
import {
  extractGeminiUsage,
  extractGeminiUsageFromChunk,
} from "../utils/extractUsage.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";
import { TrackedStream } from "./TrackedStream.js";
import { FluxGateContext } from "../types/types.js";

export function createSendMessageWrapper(
  original: Chat["sendMessage"],
  instance: FluxGate,
  modelName: string,
  context: FluxGateContext | undefined,
) {
  return async function wrappedSendMessage(
    params: SendMessageParameters,
  ): Promise<WithTracking<GenerateContentResponse>> {
    const start = performance.now();
    const serviceTier = params.config?.serviceTier;

    let result: GenerateContentResponse;
    try {
      result = await original(params);
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
        serviceTier,
      });
      throw err;
    }

    const candidate = result.candidates?.[0];
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
      serviceTier,
    });

    return Object.assign(result, { fluxGateCostTrackingResponse });
  };
}

export function createSendMessageStreamWrapper(
  original: Chat["sendMessageStream"],
  instance: FluxGate,
  modelName: string,
  context: FluxGateContext | undefined,
) {
  return async function wrappedSendMessageStream(
    params: SendMessageParameters,
  ): Promise<TrackedStream<GenerateContentResponse>> {
    const start = performance.now();
    const serviceTier = params.config?.serviceTier;

    let stream: AsyncGenerator<GenerateContentResponse>;
    try {
      stream = await original(params);
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
        serviceTier,
      });
      throw err;
    }

    const trackedStream = new TrackedStream(
      stream,
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
          serviceTier,
        });
      },
    );

    return trackedStream;
  };
}

export interface TrackedChat {
  sendMessage(
    params: SendMessageParameters,
  ): Promise<WithTracking<GenerateContentResponse>>;

  sendMessageStream(
    params: SendMessageParameters,
  ): Promise<TrackedStream<GenerateContentResponse>>;

  getHistory(): Content[];

  withTracking(context: FluxGateContext): TrackedChat;
}

export function wrapChatSession(
  chat: Chat,
  instance: FluxGate,
  modelName: string,
  context: FluxGateContext | undefined,
): TrackedChat {
  return {
    sendMessage: createSendMessageWrapper(
      chat.sendMessage.bind(chat),
      instance,
      modelName,
      context,
    ),

    sendMessageStream: createSendMessageStreamWrapper(
      chat.sendMessageStream.bind(chat),
      instance,
      modelName,
      context,
    ),

    getHistory(): Content[] {
      return chat.getHistory();
    },

    withTracking(newContext: FluxGateContext): TrackedChat {
      const mergedContext = context
        ? { ...context, ...newContext }
        : newContext;
      return wrapChatSession(chat, instance, modelName, mergedContext);
    },
  };
}
