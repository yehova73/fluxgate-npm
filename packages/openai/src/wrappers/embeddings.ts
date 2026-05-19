import { FluxGate, WithTracking } from "@fluxgate/sdk";
import type OpenAI from "openai";
import { extractEmbeddingUsage } from "../utils/extractUsage.js";
import { recordUsage } from "../utils/recordUsage.js";
import { FluxGateContext } from "../types/types.js";

type OrigCreate = OpenAI["embeddings"]["create"];
type CreateEmbeddingResponse = OpenAI.CreateEmbeddingResponse;

export function createEmbeddingsWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
  provider: string,
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
        instance,
        model: params.model,
        latencyMs: performance.now() - start,
        streaming: false,
        context,
        usage: extractEmbeddingUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
        provider,
      });
      throw err;
    }

    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model: params.model,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractEmbeddingUsage(res?.usage),
      status: "SUCCESS",
      provider,
    });
    return Object.assign(res, { fluxGateCostTrackingResponse });
  };
}
