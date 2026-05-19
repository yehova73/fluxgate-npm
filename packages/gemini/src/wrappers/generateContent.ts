import type {
  GoogleGenAI,
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";
import { WithTracking, FluxGate } from "@fluxgate/sdk";
import { extractGeminiUsage } from "../utils/extractUsage.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";
import { FluxGateContext } from "../types/types.js";

export function createGenerateContentWrapper(
  ai: GoogleGenAI,
  instance: FluxGate,
  context: FluxGateContext | undefined,
) {
  return async function wrappedGenerateContent(
    request: GenerateContentParameters,
  ): Promise<WithTracking<GenerateContentResponse>> {
    const start = performance.now();
    const { model } = request;
    const serviceTier = request.config?.serviceTier;

    let result: GenerateContentResponse;
    try {
      result = await ai.models.generateContent(request);
    } catch (err) {
      await recordUsage({
        instance,
        model,
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

    // Include finishMessage in error message for non-success states
    let errorMessage: string | undefined;
    if (status !== "SUCCESS" && finishMessage) {
      errorMessage = `${finishReason}: ${finishMessage}`;
    }

    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model,
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
