import {
  AiEventStatus,
  FluxGate,
  FluxGateCostTrackingResponse,
  AiEventUsage,
  AiEventMetadata,
} from "@fluxgate/sdk";
import type OpenAI from "openai";
import { FluxGateContext } from "../types/types.js";

export function detectProvider(baseURL: string): string {
  try {
    const { hostname } = new URL(baseURL);
    if (hostname === "api.openai.com") return "openai";
    if (hostname.endsWith(".azure.com")) return "azure";
    if (hostname === "api.groq.com") return "groq";
    if (hostname === "api.together.xyz") return "together";
    if (hostname === "api.x.ai") return "xai";
    if (hostname === "openrouter.ai" || hostname === "api.openrouter.ai")
      return "openrouter";
    if (hostname === "api.mistral.ai") return "mistral";
    if (hostname === "generativelanguage.googleapis.com") return "google";
    return hostname;
  } catch {
    return "openai";
  }
}

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
  provider: string;
  /** service_tier from the provider response; takes priority over context.serviceTier */
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

  // Response service tier takes priority over user-supplied context value
  const resolvedServiceTier = (serviceTier ?? context?.serviceTier) as
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
    provider,
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

export function finishReasonToStatus(
  finishReason: string | null | undefined,
): AiEventStatus {
  if (!finishReason || finishReason === "stop") return "SUCCESS";

  if (finishReason === "content_filter") return "BLOCKED";
  if (finishReason === "length") return "MAX_TOKENS";

  if (finishReason === "tool_calls" || finishReason === "function_call") {
    return "SUCCESS";
  }

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
