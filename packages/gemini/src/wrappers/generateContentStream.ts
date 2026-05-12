import type {
  GenerativeModel,
  GenerateContentStreamResult,
} from "@google/generative-ai";
import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import type { WithStreamTracking } from "../types/types.js";
import { extractGeminiUsageFromChunk } from "../utils/extractUsage.js";
import { TrackedStream } from "./TrackedStream.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";

type OrigGenerateContentStream = GenerativeModel["generateContentStream"];

export function createGenerateContentStreamWrapper(
  original: OrigGenerateContentStream,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedGenerateContentStream(
    request: Parameters<OrigGenerateContentStream>[0],
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
        usage: extractGeminiUsageFromChunk(undefined),
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
      // TrackedStream implements AsyncIterable but not full AsyncGenerator interface
      // Type assertion needed to match GenerateContentStreamResult.stream signature
      stream: trackedStream as unknown as GenerateContentStreamResult["stream"],
      // Available after stream is fully consumed
      get fluxGateCostTrackingResponse() {
        return trackedStream.fluxGateCostTrackingResponse;
      },
    };

    return streamResult;
  };
}
