import {
  AiEventMetadata,
  AiEventStatus,
  ExtractedUsage,
  FluxGate,
  FluxGateCostTrackingResponse,
} from "@fluxgate/sdk";
import type OpenAI from "openai";

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
    normalized.user = user.id;
    if (user.name != null) normalized.userName = user.name;
    if (user.email != null) normalized.userEmail = user.email;
    if (user.image != null) normalized.userImage = user.image;
    if (user.monthlyRevenue != null)
      normalized.userMonthlyRevenue = user.monthlyRevenue;
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
      isStreamed: streaming,
      latencyInMs: latencyMs,
      provider: "openai",
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

export function finishReasonToStatus(
  finishReason: string | null | undefined,
): AiEventStatus {
  if (!finishReason || finishReason === "stop") return "SUCCESS";

  // Content blocked
  if (finishReason === "content_filter") return "BLOCKED";

  // Max tokens reached
  if (finishReason === "length") return "MAX_TOKENS";

  // Tool/function calls are considered successful
  if (finishReason === "tool_calls" || finishReason === "function_call") {
    return "SUCCESS";
  }

  // Unknown reasons default to error
  return "ERROR";
}

export function extractResponseStatus(
  response: OpenAI.Responses.Response | undefined,
): {
  status: AiEventStatus;
  errorMessage?: string;
} {
  if (!response) return { status: "SUCCESS" };
  if (response.status === "failed") {
    return { status: "ERROR", errorMessage: response.error?.message };
  }
  if (
    response.status === "incomplete" &&
    response.incomplete_details?.reason === "content_filter"
  ) {
    return { status: "BLOCKED" };
  }
  return { status: "SUCCESS" };
}
