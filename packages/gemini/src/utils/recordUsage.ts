import {
  AiEventMetadata,
  AiEventStatus,
  TrackedUser,
  FluxGateCostTrackingResponse,
  ExtractedUsage,
  FluxGate,
} from "@fluxgate/sdk";

function normalizeMetadata(
  context: AiEventMetadata | undefined,
  status: AiEventStatus,
  errorMessage: string | undefined,
): AiEventMetadata {
  const { user, ...rest } = context ?? {};

  const normalized: AiEventMetadata = { ...rest, status, errorMessage };

  if (typeof user === "string") {
    normalized.user = user;
  } else if (user != null) {
    const trackedUser = user as TrackedUser;
    normalized.user = trackedUser;
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

  const trackingData = await instance.recordEvent({
    metadata: normalizeMetadata(context, status, errorMessage),
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

  // Content filter/recitation
  if (finishReason === "RECITATION" || finishReason === "LANGUAGE") {
    return "CONTENT_FILTER";
  }

  // Malformed request
  if (finishReason === "MALFORMED_FUNCTION_CALL") {
    return "MALFORMED_REQUEST";
  }

  // Other errors
  return "ERROR";
}
