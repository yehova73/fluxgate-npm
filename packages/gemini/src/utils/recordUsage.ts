import {
  AiEventStatus,
  FluxGateCostTrackingResponse,
  AiEventUsage,
  AiEventMetadata,
  CostOverride,
  FluxGate,
} from "@fluxgate/sdk";
import {
  FluxGateContext,
  GeminiAiEventUsage,
  GeminiCostOverride,
} from "../types/types.js";

function toPerformanceStatus(status: AiEventStatus): "SUCCESS" | "ERROR" {
  return status === "ERROR" || status === "MALFORMED_REQUEST"
    ? "ERROR"
    : "SUCCESS";
}

/** Maps Gemini-specific usage (thinkingTokens) to the SDK's AiEventUsage (reasoningTokens). */
function toSdkUsage(usage: GeminiAiEventUsage): AiEventUsage {
  const { thinkingTokens, ...rest } = usage;
  return {
    ...rest,
    ...(thinkingTokens != null && { reasoningTokens: thinkingTokens }),
  };
}

/** Maps GeminiCostOverride (thinkingCostPer1MTokens) to the SDK's CostOverride (reasoningCostPer1MTokens). */
function toSdkCostOverride(override: GeminiCostOverride): CostOverride {
  const { thinkingCostPer1MTokens, ...rest } = override;
  return {
    ...rest,
    ...(thinkingCostPer1MTokens != null && {
      reasoningCostPer1MTokens: thinkingCostPer1MTokens,
    }),
  };
}

export async function recordUsage(params: {
  instance: FluxGate;
  model: string;
  latencyMs: number;
  streaming: boolean;
  context: FluxGateContext | undefined;
  usage: GeminiAiEventUsage;
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
    (context?.metadata != null && Object.keys(context.metadata).length > 0);

  const metadata: AiEventMetadata | undefined = hasMetadata
    ? {
        ...context?.metadata, // user-supplied (lower priority)
        serviceTier: resolvedServiceTier,
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
    performance: {
      latency: latencyMs,
      status: toPerformanceStatus(status),
      isStreamed: streaming,
      errorMessage: errorMessage ?? null,
    },
    usage: toSdkUsage(usage),
    ...(metadata && { metadata }),
    ...(context?.costOverride && {
      costOverride: toSdkCostOverride(context.costOverride),
    }),
  });

  return {
    status,
    cost: trackingData?.totalCost ?? null,
    trackingId: trackingData?.recordId ?? null,
    createdAt: trackingData?.timestamp ?? null,
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
