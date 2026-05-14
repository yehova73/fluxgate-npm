import {
  AiEventMetadata,
  AiEventStatus,
  ExtractedUsage,
  FluxGate,
  FluxGateCostTrackingResponse,
} from "@fluxgate/sdk";
import type OpenAI from "openai";

export function detectProvider(baseURL: string): string {
  try {
    const { hostname } = new URL(baseURL);
    if (hostname === "api.openai.com") return "openai";
    if (hostname.endsWith(".azure.com")) return "azure";
    if (hostname === "api.groq.com") return "groq";
    if (hostname === "api.together.xyz") return "together";
    if (hostname === "openrouter.ai" || hostname === "api.openrouter.ai") return "openrouter";
    if (hostname === "api.mistral.ai") return "mistral";
    if (hostname === "generativelanguage.googleapis.com") return "google";
    return hostname;
  } catch {
    return "openai";
  }
}

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
  provider: string;
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
    provider,
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
      isStreamed: streaming,
      latencyInMs: latencyMs,
      provider,
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
  if (
    response.status === "incomplete" &&
    response.incomplete_details?.reason === "max_output_tokens"
  ) {
    return { status: "MAX_TOKENS" };
  }
  return { status: "SUCCESS" };
}
