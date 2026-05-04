// models/ai-event.ts

export type AiEventStatus = "SUCCESS" | "ERROR" | "BLOCKED";

export type TrackedUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  monthlyRevenue?: string;
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
  errorMessage?: string;
  status?: AiEventStatus;

  // allow passthrough, but don’t rely on it
  [key: string]: unknown;
};

export type LLMEvent = {
  usage: AiEventUsage;
  metadata?: AiEventMetadata;
};

export type CreateAiEventResponse = {
  id: string;
  createdAt: string;
  cost: number | null;
};

export interface TokenTrackerConfig {
  apiKey: string;

  endpoint?: string;

  debug?: boolean;

  timeout?: number;
}
