import type {
  GoogleGenAI,
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import {
  extractGeminiUsage,
  extractGeminiUsageFromChunk,
} from "../utils/extractUsage.js";
import { TrackedStream } from "./TrackedStream.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";

export function createGenerateContentStreamWrapper(
  ai: GoogleGenAI,
  instance: FluxGate,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedGenerateContentStream(
    request: GenerateContentParameters,
  ): Promise<TrackedStream<GenerateContentResponse>> {
    const start = performance.now();
    const { model } = request;
    const serviceTier = request.config?.serviceTier;

    let stream: AsyncGenerator<GenerateContentResponse>;
    try {
      stream = await ai.models.generateContentStream(request);
    } catch (err) {
      await recordUsage({
        instance,
        model,
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

    // Wrap the stream to track usage after completion
    const trackedStream = new TrackedStream(
      stream,
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
          model,
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
