import {
  AiEventMetadata,
  AiEventStatus,
  FluxGateCostTrackingResponse,
  ExtractedUsage,
  FluxGate,
} from "@fluxgate/sdk";

function normalizeMetadata(
  context: AiEventMetadata | undefined,
): AiEventMetadata {
  const { user, ...rest } = context ?? {};

  const normalized: AiEventMetadata = { ...rest };

  if (typeof user === "string") {
    normalized.user = user;
  } else if (user != null) {
    normalized.user = user;
  }

  return normalized;
}

export async function recordUsage(params: {
  instance: FluxGate;
  model: string;
  latencyMs: number;
  streaming: boolean;
  context: AiEventMetadata | undefined;
  usage: ExtractedUsage;
  status: AiEventStatus;
  errorMessage?: string;
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

  const metadata = normalizeMetadata(context);
  if (serviceTier != null) metadata.service_tier = serviceTier;

  const trackingData = await instance.recordEvent({
    metadata,
    status: {
      status,
      errorMessage,
    },
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      model,
      provider: "google",
      latencyInMs: latencyMs,
      isStreamed: streaming,
      streamingDurationInMs: streaming ? latencyMs : undefined,
    },
  });

  return {
    status,
    cost: trackingData?.cost ?? null,
    trackingId: trackingData?.id ?? null,
    createdAt: trackingData?.createdAt ?? null,
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
