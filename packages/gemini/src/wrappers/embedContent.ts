import type {
  GoogleGenAI,
  EmbedContentParameters,
  EmbedContentResponse,
} from "@google/genai";
import {
  WithTracking,
  FluxGate,
  FluxGateCostTrackingResponse,
} from "@fluxgate/sdk";
import { recordUsage } from "../utils/recordUsage.js";
import { FluxGateContext } from "../types/types.js";

export function createEmbedContentWrapper(
  ai: GoogleGenAI,
  instance: FluxGate,
  context: FluxGateContext | undefined,
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
      try {
        await recordUsage({
          instance,
          model,
          latencyMs: performance.now() - start,
          streaming: false,
          context,
          usage: { promptTokens: 0, completionTokens: 0 },
          status: "ERROR",
          errorMessage: (err as Error).message,
        });
      } catch {
        // Tracking failure must never surface as a user-facing error.
      }
      throw err;
    }

    // Embeddings don't produce output tokens, just consume input
    // Gemini doesn't provide token count in embed response
    let fluxGateCostTrackingResponse: FluxGateCostTrackingResponse = {
      status: "SUCCESS",
      cost: null,
      trackingId: null,
      createdAt: null,
    };
    try {
      fluxGateCostTrackingResponse = await recordUsage({
        instance,
        model,
        latencyMs: performance.now() - start,
        streaming: false,
        context,
        usage: { promptTokens: 0, completionTokens: 0 },
        status: "SUCCESS",
      });
    } catch {
      // Tracking failure must never surface as a user-facing error.
    }

    return Object.assign(result, { fluxGateCostTrackingResponse });
  };
}
