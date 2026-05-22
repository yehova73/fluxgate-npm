import {
  AiEventStatus,
  FluxGateCostTrackingResponse,
  AiEventUsage,
  AiEventMetadata,
  FluxGate,
} from "@fluxgate/sdk";
import { FluxGateContext } from "../types/types.js";

function toPerformanceStatus(status: AiEventStatus): "SUCCESS" | "ERROR" {
  return status === "ERROR" || status === "MALFORMED_REQUEST"
    ? "ERROR"
    : "SUCCESS";
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
  /** service_tier from the provider request config; takes priority over context.serviceTier */
  serviceTier?: string | null;
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
    serviceTier,
  } = params;

  const resolvedServiceTier = serviceTier as
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
        ...context?.metadata, // user-supplied (lower priority)
        serviceTier: resolvedServiceTier,
        region: context?.region,
        openrouterCost: context?.openrouterCost,
        cacheTtl: context?.cacheTtl,
      }
    : undefined;

  const trackingData = await instance.recordEvent({
    provider: "google",
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
    cost: trackingData?.totalCost ?? null,
    trackingId: trackingData?.recordId ?? null,
    createdAt: null,
    errorMessage,
  };
}

export function finishReasonToStatus(
  finishReason: string | undefined,
): AiEventStatus {
  if (!finishReason || finishReason === "STOP") return "SUCCESS";

  // Content blocked by safety filters
  if (
    finishReason === "SAFETY" ||
    finishReason === "BLOCKLIST" ||
    finishReason === "PROHIBITED_CONTENT" ||
    finishReason === "SPII"
  ) {
    return "BLOCKED";
  }

  // Max tokens reached
  if (finishReason === "MAX_TOKENS") return "MAX_TOKENS";

  // Copyright recitation
  if (finishReason === "RECITATION") {
    return "RECITATION";
  }

  // Language/content filter
  if (finishReason === "LANGUAGE") {
    return "CONTENT_FILTER";
  }

  // Malformed request
  if (finishReason === "MALFORMED_FUNCTION_CALL") {
    return "MALFORMED_REQUEST";
  }

  // "other" and unspecified are valid completions, not errors
  if (
    finishReason === "OTHER" ||
    finishReason === "FINISH_REASON_UNSPECIFIED"
  ) {
    return "SUCCESS";
  }

  // Image safety is a blocked outcome
  if (finishReason === "IMAGE_SAFETY") {
    return "BLOCKED";
  }

  // Other unrecognized reasons
  return "ERROR";
}
