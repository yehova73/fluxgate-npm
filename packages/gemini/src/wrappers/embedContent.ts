import type {
  GoogleGenAI,
  EmbedContentParameters,
  EmbedContentResponse,
} from "@google/genai";
import { AiEventMetadata, WithTracking, FluxGate } from "@fluxgate/sdk";
import { recordUsage } from "../utils/recordUsage.js";

export function createEmbedContentWrapper(
  ai: GoogleGenAI,
  instance: FluxGate,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedEmbedContent(
    request: EmbedContentParameters,
  ): Promise<WithTracking<EmbedContentResponse>> {
    const start = performance.now();
    const { model } = request;

    let result: EmbedContentResponse;
    try {
      result = await ai.models.embedContent(request);
    } catch (err) {
      await recordUsage({
        instance,
        model,
        latencyMs: performance.now() - start,
        streaming: false,
        context,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          totalTokens: 0,
        },
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    // Embeddings don't produce output tokens, just consume input
    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: {
        inputTokens: 0, // Gemini doesn't provide token count in embed response
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      },
      status: "SUCCESS",
    });

    return Object.assign(result, { fluxGateCostTrackingResponse });
  };
}
