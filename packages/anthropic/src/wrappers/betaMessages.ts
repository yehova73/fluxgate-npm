import { AiEventStatus, FluxGate, WithTracking } from "@fluxgate/sdk";
import { FluxGateContext } from "../types/types.js";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaRawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { extractAnthropicUsage } from "../utils/extractUsage.js";
import { isAsyncIterable } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../utils/recordUsage.js";

type OrigCreate = Anthropic["beta"]["messages"]["create"];

export function createBetaMessagesWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
) {
  return async function wrappedBetaMessagesCreate(
    params: Parameters<OrigCreate>[0],
    options?: Parameters<OrigCreate>[1],
  ): Promise<
    WithTracking<BetaMessage> | TrackedStream<BetaRawMessageStreamEvent>
  > {
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
        requestUser: params.metadata?.user_id ?? undefined,
      });
      throw err;
    }

    if (params.stream && isAsyncIterable(res)) {
      let latestUsage: Parameters<typeof extractAnthropicUsage>[0];
      let latestStopReason: string | null | undefined;

      const trackingSource = (async function* () {
        for await (const event of res) {
          if (event.type === "message_delta") {
            latestUsage = event.usage;
            latestStopReason = event.delta.stop_reason;
          }
          yield event as BetaRawMessageStreamEvent;
        }
      })();

      return new TrackedStream<BetaRawMessageStreamEvent>(
        trackingSource,
        (_last, streamError) => {
          const { status, errorMessage } = streamError
            ? {
                status: "ERROR" as AiEventStatus,
                errorMessage: streamError.message,
              }
            : extractResponseStatus(latestStopReason);

          return recordUsage({
            instance,
            model: params.model.toString(),
            latencyMs: performance.now() - start,
            streaming: true,
            context,
            usage: extractAnthropicUsage(latestUsage),
            status,
            errorMessage,
            requestUser: params.metadata?.user_id ?? undefined,
          });
        },
      );
    }

    const message = res as BetaMessage;
    const { status, errorMessage } = extractResponseStatus(message.stop_reason);
    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model: params.model.toString(),
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractAnthropicUsage(message.usage),
      status,
      errorMessage,
      requestUser: params.metadata?.user_id ?? undefined,
    });

    return Object.assign(message, { fluxGateCostTrackingResponse });
  };
}
