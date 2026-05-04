import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "../../../../tokentracker/dist/types/types.js";
import { WithTracking } from "../../types/types.js";
import { extractEmbeddingUsage } from "../../utils/extractUsage.js";
import { recordUsage } from "../recordUsage.js";

type OrigCreate = OpenAI["embeddings"]["create"];
type CreateEmbeddingResponse = OpenAI.CreateEmbeddingResponse;

export function createEmbeddingsWrapper(
  original: OrigCreate,
  tracker: Tracker,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedEmbeddingsCreate(
    params: Parameters<OrigCreate>[0],
  ): Promise<WithTracking<CreateEmbeddingResponse>> {
    const start = performance.now();

    let res: Awaited<ReturnType<OrigCreate>>;
    try {
      res = await (original as any)(params);
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
