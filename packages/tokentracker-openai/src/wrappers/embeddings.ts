import { Tracker, AiEventMetadata, WithTracking } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { extractEmbeddingUsage } from "../utils/extractUsage.js";
import { recordUsage } from "../utils/recordUsage.js";

type OrigCreate = OpenAI["embeddings"]["create"];
type CreateEmbeddingResponse = OpenAI.CreateEmbeddingResponse;

export function createEmbeddingsWrapper(
  original: OrigCreate,
  tracker: Tracker,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedEmbeddingsCreate(
    params: Parameters<OrigCreate>[0],
    options?: Parameters<OrigCreate>[1],
  ): Promise<WithTracking<CreateEmbeddingResponse>> {
    const start = performance.now();

    let res: Awaited<ReturnType<OrigCreate>>;
    try {
      res = await original(params, options);
    } catch (err) {
      await recordUsage({
        tracker,
        model: params.model,
        latencyMs: performance.now() - start,
        streaming: false,
        context,
        usage: extractEmbeddingUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    const trackLlmResponse = await recordUsage({
      tracker,
      model: params.model,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractEmbeddingUsage(res?.usage),
      status: "SUCCESS",
    });
    return Object.assign(res, { trackLlmResponse });
  };
}
