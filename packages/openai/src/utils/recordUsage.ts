import {
  AiEventStatus,
  CreateAiEventResponse,
  FluxGate,
  FluxGateCostTrackingResponse,
  AiEventUsage,
  AiEventMetadata,
} from "@fluxgate/sdk";
import type OpenAI from "openai";
import { FluxGateContext } from "../types/types.js";

const OPENAI_REGION_MAP: Record<string, string> = {
  us: "us",
  eu: "eu",
  au: "au",
  ca: "ca",
  jp: "jp",
  in: "in",
  sg: "sg",
  kr: "kr",
  gb: "gb",
  ae: "ae",
};

export function detectRegion(baseURL: string): string | undefined {
  try {
    const { hostname } = new URL(baseURL);
    const match = hostname.match(/^([a-z]+)\.api\.openai\.com$/);
    if (match) return OPENAI_REGION_MAP[match[1]];
    return undefined;
  } catch {
    return undefined;
  }
}

export function detectProvider(baseURL: string): string {
  try {
    const { hostname } = new URL(baseURL);
    if (hostname === "api.openai.com" || hostname.endsWith(".api.openai.com"))
      return "openai";
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
  /** service_tier auto-captured from the provider response/request params */
  serviceTier?: string | null;
  /** user extracted from the request params (e.g. params.user). Used as fallback when context.user is not set. */
  requestUser?: string;
  /** Region auto-detected from the client baseURL (e.g. "eu", "au") */
  region?: string;
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
    requestUser,
    region,
  } = params;

  const resolvedServiceTier = serviceTier as
    | AiEventMetadata["serviceTier"]
    | undefined;

  const hasMetadata =
    resolvedServiceTier != null ||
    region != null ||
    // context?.openrouterCost != null ||
    (context?.metadata != null && Object.keys(context.metadata).length > 0);

  // User metadata is spread first so that auto-detected values (region, serviceTier)
  // cannot be accidentally overridden by arbitrary metadata keys.
  const metadata: AiEventMetadata | undefined = hasMetadata
    ? {
        ...context?.metadata,
        openrouterCost: 0, // context?.openrouterCost,
        serviceTier: resolvedServiceTier,
        region,
      }
    : undefined;

  let trackingData: CreateAiEventResponse | null = null;
  try {
    trackingData = await instance.recordEvent({
      provider,
      model,
      user: context?.user ?? requestUser,
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
      usage,
      ...(metadata && { metadata }),
      ...(context?.costOverride && { costOverride: context.costOverride }),
    });
  } catch {
    // Tracking failure must never surface as a user-facing error.
    // Return a degraded response so the caller always gets a result.
  }

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
