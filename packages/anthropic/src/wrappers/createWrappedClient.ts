import { AiEventStatus, FluxGate, WithTracking } from "@fluxgate/sdk";
import {
  FluxGateContext,
  TrackedMessages,
  TrackedBetaMessages,
} from "../types/types.js";
import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import { extractAnthropicUsage } from "../utils/extractUsage.js";
import { isAsyncIterable, detectCacheTtl } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../utils/recordUsage.js";
import { TrackedAnthropic } from "../types/types.js";
import { createCompletionsWrapper } from "./completions.js";
import { createBetaMessagesWrapper } from "./betaMessages.js";

type OrigCreate = Anthropic["messages"]["create"];

/**
 * Extracts the specific hosting region from the client's baseURL.
 *
 * - AWS Bedrock:    bedrock-runtime.{region}.amazonaws.com  â†’ e.g. "us-east-1"
 * - GCP Vertex AI: {region}-aiplatform.googleapis.com       â†’ e.g. "us-central1"
 * - Anthropic API: api.{region}.anthropic.com               â†’ e.g. "eu"
 *                  api.anthropic.com (US default)           â†’ undefined
 */
export function detectRegion(baseURL: string): string | undefined {
  try {
    const { hostname } = new URL(baseURL);

    // AWS Bedrock: bedrock-runtime.{region}.amazonaws.com
    if (hostname.includes("amazonaws.com")) {
      const parts = hostname.split(".");
      // parts: ["bedrock-runtime", "us-east-1", "amazonaws", "com"]
      return parts.length >= 4 ? parts[1] : undefined;
    }

    // GCP Vertex AI: {region}-aiplatform.googleapis.com
    if (hostname.includes("googleapis.com")) {
      const match = hostname.match(/^(.+?)-aiplatform\./);
      return match ? match[1] : undefined;
    }

    // Anthropic regional API: api.{region}.anthropic.com
    // US default (api.anthropic.com) has no region subdomain â†’ return undefined
    if (hostname.includes("anthropic.com")) {
      const parts = hostname.split(".");
      return parts.length >= 4 ? parts[1] : undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export function withAnthropicTracking(
  client: Anthropic,
  instance: FluxGate,
  context?: FluxGateContext,
): TrackedAnthropic {
  const region = detectRegion(client.baseURL);

  const wrappedClient = Object.create(
    Object.getPrototypeOf(client),
    Object.getOwnPropertyDescriptors(client),
  );

  wrappedClient.messages = buildMessagesNamespace(
    client,
    instance,
    context,
    region,
  );

  wrappedClient.completions = Object.create(
    Object.getPrototypeOf(client.completions),
    Object.getOwnPropertyDescriptors(client.completions),
  );

  wrappedClient.completions.create = createCompletionsWrapper(
    client.completions.create.bind(client.completions),
    instance,
    context,
    region,
  ) as unknown as typeof client.completions.create;

  wrappedClient.beta = Object.create(
    Object.getPrototypeOf(client.beta),
    Object.getOwnPropertyDescriptors(client.beta),
  );

  wrappedClient.beta.messages = buildBetaMessagesNamespace(
    client,
    instance,
    context,
    region,
  );

  return wrappedClient as unknown as TrackedAnthropic;
}

/** Builds the tracked `messages` namespace with `create` + `withTracking`. */
function buildMessagesNamespace(
  client: Anthropic,
  instance: FluxGate,
  context: FluxGateContext | undefined,
  region: string | undefined,
): TrackedMessages {
  const ns = Object.create(
    Object.getPrototypeOf(client.messages),
    Object.getOwnPropertyDescriptors(client.messages),
  );

  ns.create = createMessagesWrapper(
    client.messages.create.bind(client.messages),
    instance,
    context,
    region,
  );

  ns.withTracking = function (newCtx: FluxGateContext): TrackedMessages {
    const merged = context ? { ...context, ...newCtx } : newCtx;
    return buildMessagesNamespace(client, instance, merged, region);
  };

  return ns as TrackedMessages;
}

/** Builds the tracked `beta.messages` namespace with `create` + `withTracking`. */
function buildBetaMessagesNamespace(
  client: Anthropic,
  instance: FluxGate,
  context: FluxGateContext | undefined,
  region: string | undefined,
): TrackedBetaMessages {
  const ns = Object.create(
    Object.getPrototypeOf(client.beta.messages),
    Object.getOwnPropertyDescriptors(client.beta.messages),
  );

  ns.create = createBetaMessagesWrapper(
    client.beta.messages.create.bind(client.beta.messages),
    instance,
    context,
    region,
  );

  ns.withTracking = function (newCtx: FluxGateContext): TrackedBetaMessages {
    const merged = context ? { ...context, ...newCtx } : newCtx;
    return buildBetaMessagesNamespace(client, instance, merged, region);
  };

  return ns as TrackedBetaMessages;
}

export function createMessagesWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
  region: string | undefined,
) {
  return async function wrappedMessagesCreate(
    params: Parameters<OrigCreate>[0],
    options?: Parameters<OrigCreate>[1],
  ): Promise<WithTracking<Message> | TrackedStream<RawMessageStreamEvent>> {
    const start = performance.now();
    const cacheTtl = detectCacheTtl(
      params as Parameters<typeof detectCacheTtl>[0],
    );

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
        region,
        cacheTtl,
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
            requestUser: params.metadata?.user_id ?? undefined,
            region,
            cacheTtl,
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
      requestUser: params.metadata?.user_id ?? undefined,
      region,
      cacheTtl,
    });

    return Object.assign(message, { fluxGateCostTrackingResponse });
  };
}
