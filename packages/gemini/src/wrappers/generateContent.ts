import type {
  GenerativeModel,
  GenerateContentResult,
} from "@google/generative-ai";
import { AiEventMetadata, WithTracking, FluxGate } from "@fluxgate/sdk";
import { extractGeminiUsage } from "../utils/extractUsage.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";

type OrigGenerateContent = GenerativeModel["generateContent"];

export function createGenerateContentWrapper(
  original: OrigGenerateContent,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedGenerateContent(
    request: Parameters<OrigGenerateContent>[0],
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

    // Include finishMessage in error message for non-success states
    let errorMessage: string | undefined;
    if (status !== "SUCCESS" && finishMessage) {
      errorMessage = `${finishReason}: ${finishMessage}`;
    }

    const trackLlmResponse = await recordUsage({
      instance,
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
