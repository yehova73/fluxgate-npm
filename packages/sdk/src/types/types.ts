export type AiEventStatus =
  | "SUCCESS"
  | "ERROR"
  | "BLOCKED"
  | "MAX_TOKENS"
  | "CONTENT_FILTER"
  | "RECITATION"
  | "MALFORMED_REQUEST";

export type TrackedUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  monthlyRevenue?: number;
};

export type AiEventUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  model?: string;
  provider?: string;
  latencyInMs?: number;
  isStreamed?: boolean;
  streamingDurationInMs?: number;
};

export type AiEventMetadata = {
  feature?: string;
  step?: string;
  user?: string | TrackedUser;
  sessionId?: string;
  conversationId?: string;
  timestamp?: Date;

  [key: string]: unknown;
};

export type LLMEvent = {
  usage: AiEventUsage;
  status?:
    | AiEventStatus
    | {
        status: AiEventStatus;
        errorMessage?: string;
      };
  metadata?: AiEventMetadata;
};

export type CreateAiEventResponse = {
  id: string;
  createdAt: string;
  cost: number | null;
};

export interface FluxGateConfig {
  apiKey: string;

  endpoint?: string;

  debug?: boolean;

  timeout?: number;
}

export type TrackLlmResponse = {
  status: AiEventStatus;
  cost: number | null;
  trackingId: string | null;
  createdAt: string | null;
  errorMessage?: string;
};

export type WithTracking<T> = T & { trackLlmResponse: TrackLlmResponse };

export type ExtractedUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
};
