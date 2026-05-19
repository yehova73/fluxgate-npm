import {
  AiEventStatus,
  FluxGate,
  FluxGateCostTrackingResponse,
  AiEventUsage,
  AiEventMetadata,
} from "@fluxgate/sdk";
import { FluxGateContext } from "../types/types.js";

function toPerformanceStatus(status: AiEventStatus): "SUCCESS" | "ERROR" {
  return status === "ERROR" || status === "MALFORMED_REQUEST"
    ? "ERROR"
    : "SUCCESS";
}

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

  if (stopReason === "max_tokens") {
    return "MAX_TOKENS";
  }

  if (stopReason === "content_filter") {
    return "BLOCKED";
  }

  if (stopReason === "tool_use") {
    return "SUCCESS";
  }

  return "ERROR";
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
  } = params;

  const resolvedServiceTier = context?.serviceTier as
    | AiEventMetadata["serviceTier"]
    | undefined;

  const hasMetadata =
    resolvedServiceTier != null ||
    context?.region != null ||
    context?.openrouterCost != null ||
    context?.cacheTtl != null ||
    (context?.metadata != null && Object.keys(context.metadata).length > 0);

  const metadata: AiEventMetadata | undefined = hasMetadata
    ? {
        serviceTier: resolvedServiceTier,
        region: context?.region,
        openrouterCost: context?.openrouterCost,
        cacheTtl: context?.cacheTtl,
        ...context?.metadata,
      }
    : undefined;

  const trackingData = await instance.recordEvent({
    provider: "anthropic",
    model,
    user: context?.user,
    feature: context?.feature,
    step: context?.step,
    sessionId: context?.sessionId,
    conversationId: context?.conversationId,
    timestamp: context?.timestamp,
    performance: {
      latency: latencyMs,
      status: toPerformanceStatus(status),
      isStreamed: streaming,
      errorMessage: errorMessage ?? null,
    },
    usage,
    ...(metadata && { metadata }),
    ...(context?.costOverride && { costOverride: context.costOverride }),
  });

  return {
    status,
    errorMessage,
    cost: trackingData?.totalCost ?? null,
    trackingId: trackingData?.recordId ?? null,
    createdAt: null,
  };
}

export function extractResponseStatus(stopReason: string | null | undefined): {
  status: AiEventStatus;
  errorMessage?: string;
} {
  return { status: stopReasonToStatus(stopReason) };
}
