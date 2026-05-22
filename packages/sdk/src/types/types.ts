export type AiEventStatus =
  | "SUCCESS"
  | "ERROR"
  | "BLOCKED"
  | "MAX_TOKENS"
  | "CONTENT_FILTER"
  | "RECITATION"
  | "MALFORMED_REQUEST";

export type UserSession = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  /** Monthly revenue in USD as a string (e.g. "99.99") */
  monthlyRevenue?: number | string | null;
};

export type Performance = {
  /** Total round-trip time in milliseconds from request start to final response closure */
  latency: number;
  /** HTTP status category returned by the provider */
  status:
    | "SUCCESS"
    | "ERROR"
    | "BLOCKED"
    | "MAX_TOKENS"
    | "CONTENT_FILTER"
    | "RECITATION"
    | "MALFORMED_REQUEST";
  /** Whether the response was processed via SSE streaming */
  isStreamed: boolean;
  /** Active streaming connection duration in ms (Total Duration - TTFT). Null if not streamed or request failed. */
  streamDuration?: number | null;
  /** Raw error string if the request failed. Null/undefined if successful. */
  errorMessage?: string | null;
};

export type AiEventUsage = {
  /** Fresh text tokens evaluated down the wire (input/prompt tokens) */
  promptTokens: number;
  /** Generation tokens sent back from the inference machine (output tokens) */
  completionTokens: number;
  /** Tokens read from a warm cache layer (e.g. OpenAI/Anthropic prompt caching) */
  cacheReadTokens?: number | null;
  /** Tokens written to initialize or refresh a cold cache block */
  cacheWriteTokens?: number | null;
  /** Internal thinking/reasoning tokens (e.g. OpenAI o1/o3, DeepSeek R1) */
  reasoningTokens?: number | null;
};

export type AiEventMetadata = {
  /** Service tiering mode affecting pricing multipliers */
  serviceTier?: "default" | "standard" | "batch" | "flex" | "priority";
  /** Explicit hosting region for regional price variance (e.g. AWS Bedrock / Google Vertex) */
  region?: string;
  /** Explicit total cost in USD from an aggregator proxy (e.g. OpenRouter, LiteLLM). Skips server-side cost computation. */
  openrouterCost?: number;
  /** Provider cache expiration window. Accepts "5m", "1h", or a custom string. */
  cacheTtl?: string;
  [key: string]: unknown;
};

export type CostOverride = {
  /** Price per 1,000,000 base prompt tokens */
  inputCostPer1MTokens: number;
  /** Price per 1,000,000 baseline generation output tokens */
  outputCostPer1MTokens: number;
  /** Surcharge rate for writing/saving a prompt segment to cache */
  cacheWriteCostPer1MTokens?: number | null;
  /** Discounted rate for reading from a warm prompt segment cache */
  cacheReadCostPer1MTokens?: number | null;
  /** Customized rate for isolated reasoning execution blocks */
  reasoningCostPer1MTokens?: number | null;
};

export type LLMEvent = {
  /** AI provider identifier (e.g. "openai", "anthropic", "google", "xai", "deepseek") */
  provider: string;
  /** Model identifier (e.g. "gpt-4o", "claude-opus-4", "gemini-2.0-flash") */
  model: string;
  /** End-user who triggered the event — either a plain string ID or a UserSession object */
  user?: string | UserSession;
  /** Product feature name (e.g. "chat", "summarization", "embedding") */
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  /** Unix timestamp in milliseconds. Defaults to server ingest time if omitted. */
  timestamp?: number;
  performance: Performance;
  usage: AiEventUsage;
  metadata?: AiEventMetadata;
  costOverride?: CostOverride;
};

export type CreateAiEventResponse = {
  /** ID of the persisted AiEvent record */
  recordId: string;
  /** Sum of all token categories */
  totalTokens: number;
  /** Computed total cost in USD. Null when no pricing data is available. */
  totalCost: number | null;
  /** ok — cost was successfully computed; no_pricing — model/provider not in pricing table */
  status: "ok" | "no_pricing";
  /** Unix timestamp in milliseconds. Defaults to server ingest time if omitted. */
  timestamp?: number;
  /** Human-readable explanation of how the cost was derived */
  description?: string;
};

export type FluxGateLogger = (
  level: "log" | "error",
  message: string,
  data?: unknown,
) => void;

export interface FluxGateConfig {
  apiKey: string;

  endpoint?: string;

  debug?: boolean;

  timeout?: number;

  /**
   * Custom logger called instead of console.log/console.error when debug is true.
   * Receives the level ("log" | "error"), a message string, and an optional data value.
   * Defaults to console.log / console.error.
   */
  logger?: FluxGateLogger;
}

export type FluxGateCostTrackingResponse = {
  status: AiEventStatus;
  cost: number | null;
  trackingId: string | null;
  createdAt: number | null;
  errorMessage?: string;
};

export type WithTracking<T> = T & {
  fluxGateCostTrackingResponse: FluxGateCostTrackingResponse;
};

export type ExtractedUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
};
