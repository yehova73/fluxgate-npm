import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import {
  AiEventMetadata,
  AiEventStatus,
  TrackedUser,
} from "../../../tokentracker/dist/types/types.js";
import { ExtractedUsage, TrackLlmResponse } from "../types/types.js";

function normalizeMetadata(
  context: AiEventMetadata | undefined,
  status: AiEventStatus,
  errorMessage: string | undefined,
): AiEventMetadata {
  const { userId, ...rest } = context ?? {};

  const normalized: AiEventMetadata = { ...rest, status, errorMessage };

  if (typeof userId === "string") {
    normalized.userId = userId;
  } else if (userId != null) {
    const user = userId as TrackedUser;
    normalized.userId = user.id;
    if (user.name != null) normalized.userName = user.name;
    if (user.email != null) normalized.userEmail = user.email;
    if (user.image != null) normalized.userImage = user.image;
    if (user.monthlyRevenue != null)
      normalized.userMonthlyRevenue = user.monthlyRevenue;
  }

  return normalized;
}

export async function recordUsage(params: {
  tracker: Tracker;
  model: string;
  latencyMs: number;
  streaming: boolean;
  context: AiEventMetadata | undefined;
  usage: ExtractedUsage;
  status: AiEventStatus;
  errorMessage?: string;
}): Promise<TrackLlmResponse> {
  const {
    context,
    latencyMs,
    model,
    streaming,
    tracker,
    usage,
    status,
    errorMessage,
  } = params;

  const trackingData = await tracker.recordEvent({
    metadata: normalizeMetadata(context, status, errorMessage),
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
  if (finishReason === "content_filter") return "BLOCKED";
  return "SUCCESS";
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
