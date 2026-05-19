import { AiEventStatus, FluxGate, WithTracking } from "@fluxgate/sdk";
import { FluxGateContext } from "../types/types.js";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import { extractAnthropicUsage } from "../utils/extractUsage.js";
import { isAsyncIterable } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../utils/recordUsage.js";
import { TrackedAnthropic } from "../types/types.js";
import { createCompletionsWrapper } from "./completions.js";
import { createBetaMessagesWrapper } from "./betaMessages.js";

type OrigCreate = Anthropic["messages"]["create"];

export function withAnthropicTracking(
  client: Anthropic,
  instance: FluxGate,
  context?: FluxGateContext,
): TrackedAnthropic {
  const wrappedClient = Object.create(
    Object.getPrototypeOf(client),
    Object.getOwnPropertyDescriptors(client),
  );

  wrappedClient.messages = Object.create(
    Object.getPrototypeOf(client.messages),
    Object.getOwnPropertyDescriptors(client.messages),
  );

  wrappedClient.messages.create = createMessagesWrapper(
    client.messages.create.bind(client.messages),
    instance,
    context,
  ) as unknown as typeof client.messages.create;

  wrappedClient.completions = Object.create(
    Object.getPrototypeOf(client.completions),
    Object.getOwnPropertyDescriptors(client.completions),
  );

  wrappedClient.completions.create = createCompletionsWrapper(
    client.completions.create.bind(client.completions),
    instance,
    context,
  ) as unknown as typeof client.completions.create;

  wrappedClient.beta = Object.create(
    Object.getPrototypeOf(client.beta),
    Object.getOwnPropertyDescriptors(client.beta),
  );

  wrappedClient.beta.messages = Object.create(
    Object.getPrototypeOf(client.beta.messages),
    Object.getOwnPropertyDescriptors(client.beta.messages),
  );

  wrappedClient.beta.messages.create = createBetaMessagesWrapper(
    client.beta.messages.create.bind(client.beta.messages),
    instance,
    context,
  ) as unknown as typeof client.beta.messages.create;

  return wrappedClient as unknown as TrackedAnthropic;
}

export function createMessagesWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
) {
  return async function wrappedMessagesCreate(
    params: Parameters<OrigCreate>[0],
    options?: Parameters<OrigCreate>[1],
  ): Promise<WithTracking<Message> | TrackedStream<RawMessageStreamEvent>> {
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
      let latestUsage: Parameters<typeof extractAnthropicUsage>[0];
      let latestStopReason: string | null | undefined;

      const trackingSource = (async function* () {
        for await (const event of res) {
          if (event.type === "message_delta") {
            latestUsage = event.usage;
            latestStopReason = event.delta.stop_reason;
          }

          yield event as RawMessageStreamEvent;
        }
      })();

      return new TrackedStream<RawMessageStreamEvent>(
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
          });
        },
      );
    }

    const message = res as Message;
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
    });

    return Object.assign(message, { fluxGateCostTrackingResponse });
  };
}
