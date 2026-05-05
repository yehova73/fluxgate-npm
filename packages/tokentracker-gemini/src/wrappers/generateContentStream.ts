import { Tracker } from "@llmwatch/tokentracker";
import type {
  GenerativeModel,
  GenerateContentStreamResult,
  EnhancedGenerateContentResponse,
} from "@google/generative-ai";
import { AiEventMetadata, WithTracking } from "@llmwatch/tokentracker";
import { TrackedStream } from "./TrackedStream.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";

type OrigGenerateContentStream = GenerativeModel["generateContentStream"];

function extractStreamUsage(
  lastChunk: EnhancedGenerateContentResponse | undefined,
) {
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

export function createGenerateContentStreamWrapper(
  original: OrigGenerateContentStream,
  tracker: Tracker,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedGenerateContentStream(
    request: Parameters<OrigGenerateContentStream>[0],
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

    // Wrap the stream to track usage after completion
    const trackedStream = new TrackedStream(
      result.stream,
      async (lastChunk, streamError) => {
        const candidate = lastChunk?.candidates?.[0];
        const finishReason = candidate?.finishReason;
        const finishMessage = candidate?.finishMessage;
        const status = streamError
          ? "ERROR"
          : finishReasonToStatus(finishReason);

        // Include finishMessage in error message for non-success states
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
      // TrackedStream implements AsyncIterable but not full AsyncGenerator interface
      // Type assertion needed to match GenerateContentStreamResult.stream signature
      stream: trackedStream as any,
      // Proxy to get trackLlmResponse from stream after completion
      get trackLlmResponse() {
        return trackedStream.trackLlmResponse!;
      },
    };

    return streamResult;
  };
}
