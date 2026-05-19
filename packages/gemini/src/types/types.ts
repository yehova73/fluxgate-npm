import type {
  EmbedContentResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  EmbedContentParameters,
  CreateChatParameters,
  SendMessageParameters,
  Content,
} from "@google/genai";
import type { TrackedChat } from "../wrappers/chatSession.js";
import type { TrackedStream } from "../wrappers/TrackedStream.js";
import type {
  FluxGateCostTrackingResponse,
  WithTracking,
  TrackedUser,
  AiEventMetadata,
  CostOverride,
} from "@fluxgate/sdk";

export type WithStreamTracking<T> = T & {
  fluxGateCostTrackingResponse: FluxGateCostTrackingResponse | undefined;
};

export type TrackedGeminiClient = {
  generateContent(
    request: GenerateContentParameters,
  ): Promise<WithTracking<GenerateContentResponse>>;

  generateContentStream(
    request: GenerateContentParameters,
  ): Promise<TrackedStream<GenerateContentResponse>>;

  embedContent(
    request: EmbedContentParameters,
  ): Promise<WithTracking<EmbedContentResponse>>;

  startChat(params: CreateChatParameters): TrackedChat;
};

/**
 * Context passed to `withContext()` to annotate events with user/feature/billing info.
 */
export type FluxGateContext = {
  /** End-user who triggered the event — plain string ID or a TrackedUser object */
  user?: string | TrackedUser;
  /** Product feature name (e.g. "chat", "summarization") */
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  /** Unix timestamp in milliseconds. Defaults to server ingest time if omitted. */
  timestamp?: number;
  /** Service tiering mode affecting pricing multipliers */
  serviceTier?: AiEventMetadata["serviceTier"];
  /** Explicit hosting region for regional price variance */
  region?: string;
  /** Explicit total cost in USD from an aggregator proxy. Skips server-side cost computation. */
  openrouterCost?: number;
  /** Provider cache expiration window. Accepts "5m", "1h", or a custom string. */
  cacheTtl?: string;
  /** Override per-token pricing used for cost calculation */
  costOverride?: CostOverride;
  /** Arbitrary key-value pairs forwarded to the metadata object (e.g. { language: "typescript", documentType: "article" }) */
  metadata?: Record<string, unknown>;
};

export type {
  TrackedChat,
  EmbedContentResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  EmbedContentParameters,
  CreateChatParameters,
  SendMessageParameters,
  Content,
};
