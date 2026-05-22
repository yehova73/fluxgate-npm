import { FluxGate, WithTracking } from "@fluxgate/sdk";
import type OpenAI from "openai";
import { extractChatUsage } from "../utils/extractUsage.js";
import { isAsyncIterable } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { finishReasonToStatus, recordUsage } from "../utils/recordUsage.js";
import { FluxGateContext } from "../types/types.js";

type OrigCreate = OpenAI["completions"]["create"];
type Completion = OpenAI.Completions.Completion;

export function createCompletionsWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
  provider: string,
  region: string | undefined,
) {
  return async function wrappedCompletionsCreate(
    params: Parameters<OrigCreate>[0],
    options?: Parameters<OrigCreate>[1],
  ): Promise<WithTracking<Completion> | TrackedStream<Completion>> {
    const start = performance.now();

    let res: Awaited<ReturnType<OrigCreate>>;
    try {
      res = await original(params, options);
    } catch (err) {
      await recordUsage({
        instance,
        model: params.model,
        latencyMs: performance.now() - start,
        streaming: !!params.stream,
        context,
        usage: extractChatUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
        provider,
        region,
        requestUser: params.user ?? undefined,
      });
      throw err;
    }

    if (params.stream && isAsyncIterable(res)) {
      return new TrackedStream<Completion>(res, (lastChunk, streamError) =>
        recordUsage({
          instance,
          model: params.model,
          latencyMs: performance.now() - start,
          streaming: true,
          context,
          usage: extractChatUsage(lastChunk?.usage),
          status: streamError
            ? "ERROR"
            : finishReasonToStatus(lastChunk?.choices?.[0]?.finish_reason),
          errorMessage: streamError?.message,
          provider,
          region,
          requestUser: params.user ?? undefined,
        }),
      );
    }

    const completion = res as Completion;
    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model: params.model,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractChatUsage(completion?.usage),
      status: finishReasonToStatus(completion?.choices?.[0]?.finish_reason),
      provider,
      region,
      requestUser: params.user ?? undefined,
    });
    return Object.assign(completion, { fluxGateCostTrackingResponse });
  };
}
