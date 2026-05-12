import {
  AiEventMetadata,
  AiEventStatus,
  ExtractedUsage,
  FluxGate,
  FluxGateCostTrackingResponse,
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
    metadata: normalizeMetadata(context),
    status: {
      status,
      errorMessage,
    },
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      model,
      isStreamed: streaming,
      latencyInMs: latencyMs,
      provider: "anthropic",
      streamingDurationInMs: streaming ? latencyMs : undefined,
    },
  });

  return {
    status,
    errorMessage,
    cost: trackingData?.cost ?? null,
    trackingId: trackingData?.id ?? null,
    createdAt: trackingData?.createdAt ?? null,
  };
}

export function extractResponseStatus(stopReason: string | null | undefined): {
  status: AiEventStatus;
  errorMessage?: string;
} {
  return { status: stopReasonToStatus(stopReason) };
}
