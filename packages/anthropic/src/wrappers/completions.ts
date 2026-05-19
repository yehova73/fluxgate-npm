import { AiEventStatus, FluxGate, WithTracking } from "@fluxgate/sdk";
import { FluxGateContext } from "../types/types.js";
import type Anthropic from "@anthropic-ai/sdk";
import type { Completion } from "@anthropic-ai/sdk/resources/completions";
import { extractAnthropicUsage } from "../utils/extractUsage.js";
import { isAsyncIterable } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../utils/recordUsage.js";

type OrigCreate = Anthropic["completions"]["create"];

export function createCompletionsWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
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
        model: params.model.toString(),
        latencyMs: performance.now() - start,
        streaming: !!params.stream,
        context,
        usage: extractAnthropicUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    if (params.stream && isAsyncIterable(res)) {
      let latestStopReason: string | null | undefined;

      const trackingSource = (async function* () {
        for await (const chunk of res) {
          if (chunk.stop_reason) {
            latestStopReason = chunk.stop_reason;
          }
          yield chunk as Completion;
        }
      })();

      return new TrackedStream<Completion>(
        trackingSource,
        (_last, streamError) => {
          const { status, errorMessage } = streamError
            ? {
                status: "ERROR" as AiEventStatus,
                errorMessage: streamError.message,
              }
            : extractResponseStatus(latestStopReason);

          // The legacy completions API does not return token usage
          return recordUsage({
            instance,
            model: params.model.toString(),
            latencyMs: performance.now() - start,
            streaming: true,
            context,
            usage: extractAnthropicUsage(undefined),
            status,
            errorMessage,
          });
        },
      );
    }

    const completion = res as Completion;
    const { status, errorMessage } = extractResponseStatus(
      completion.stop_reason,
    );
    // The legacy completions API does not return token usage
    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model: params.model.toString(),
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractAnthropicUsage(undefined),
      status,
      errorMessage,
    });

    return Object.assign(completion, { fluxGateCostTrackingResponse });
  };
}
