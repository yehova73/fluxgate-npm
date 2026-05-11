import type {
  GenerativeModel,
  EmbedContentResponse,
} from "@google/generative-ai";
import { AiEventMetadata, WithTracking, FluxGate } from "@fluxgate/sdk";
import { recordUsage } from "../utils/recordUsage.js";

type OrigEmbedContent = GenerativeModel["embedContent"];

export function createEmbedContentWrapper(
  original: OrigEmbedContent,
  instance: FluxGate,
  modelName: string,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedEmbedContent(
    request: Parameters<OrigEmbedContent>[0],
  ): Promise<WithTracking<EmbedContentResponse>> {
    const start = performance.now();

    let result: EmbedContentResponse;
    try {
      result = await original(request);
    } catch (err) {
      await recordUsage({
        instance,
        model: modelName,
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
    const trackLlmResponse = await recordUsage({
      instance,
      model: modelName,
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

    return Object.assign(result, { trackLlmResponse });
  };
}
