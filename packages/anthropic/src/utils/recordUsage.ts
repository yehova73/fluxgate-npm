import {
  AiEventStatus,
  FluxGate,
  FluxGateCostTrackingResponse,
  AiEventUsage,
  AiEventMetadata,
  CostOverride,
} from "@fluxgate/sdk";
import { AnthropicCostOverride, FluxGateContext } from "../types/types.js";

export function stopReasonToStatus(
  stopReason: string | null | undefined,
): AiEventStatus {
  if (
    !stopReason ||
    stopReason === "end_turn" ||
    stopReason === "stop_sequence"
  ) {
    return "SUCCESS";
  }
  if (stopReason === "max_tokens") return "MAX_TOKENS";
  if (stopReason === "content_filter") return "BLOCKED";
  if (stopReason === "tool_use") return "SUCCESS";
  return "ERROR";
}

function toSdkCostOverride(override: AnthropicCostOverride): CostOverride {
  return { ...override };
}

export async function recordUsage(params: {
  instance: FluxGate;
  model: string;
  latencyMs: number;
  streaming: boolean;
  context: FluxGateContext | undefined;
  usage: AiEventUsage;
  status: AiEventStatus;
  errorMessage?: string;
  /** User extracted from the request params (e.g. params.metadata?.user_id). Used as fallback when context.user is not set. */
  requestUser?: string;
  /** Region auto-detected from the client baseURL */
  region?: string;
  /** Cache TTL auto-detected from cache_control blocks in the request */
  cacheTtl?: string;
}): Promise<FluxGateCostTrackingResponse> {
  const {
    context,
    latencyMs,
    model,
    streaming,
    instance,
    usage,
    status,
    errorMessage,
    requestUser,
    region,
    cacheTtl,
  } = params;

  const hasMetadata =
    region != null ||
    cacheTtl != null ||
    (context?.metadata != null && Object.keys(context.metadata).length > 0);

  // User metadata is spread first so auto-detected values cannot be overridden by arbitrary keys.
  const metadata: AiEventMetadata | undefined = hasMetadata
    ? {
        ...context?.metadata,
        region,
        cacheTtl,
      }
    : undefined;

  let trackingData = null;
  try {
    trackingData = await instance.recordEvent({
      provider: "anthropic",
      model,
      user: context?.user ?? requestUser,
      feature: context?.feature,
      step: context?.step,
      sessionId: context?.sessionId,
      conversationId: context?.conversationId,
      performance: {
        latency: latencyMs,
        status,
        isStreamed: streaming,
        errorMessage: errorMessage ?? null,
      },
      usage,
      ...(metadata && { metadata }),
      ...(context?.costOverride && {
        costOverride: toSdkCostOverride(context.costOverride),
      }),
    });
  } catch {
    // Tracking failure must never surface as a user-facing error.
    // Return a degraded response so the caller always gets a result.
  }

  return {
    status,
    errorMessage,
    cost: trackingData?.totalCost ?? null,
    trackingId: trackingData?.recordId ?? null,
    createdAt: trackingData?.timestamp ?? null,
  };
}

export function extractResponseStatus(stopReason: string | null | undefined): {
  status: AiEventStatus;
  errorMessage?: string;
} {
  return { status: stopReasonToStatus(stopReason) };
}
