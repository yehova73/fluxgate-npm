import type {
  GoogleGenAI,
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
  CostOverride,
  AiEventUsage,
} from "@fluxgate/sdk";

/**
 * Gemini-specific cost override.
 * - Excludes `cacheWriteCostPer1MTokens` — Gemini does not report cache-write token counts.
 * - Replaces `reasoningCostPer1MTokens` with `thinkingCostPer1MTokens` to match Gemini's terminology.
 */
export type GeminiCostOverride = Omit<
  CostOverride,
  "cacheWriteCostPer1MTokens" | "reasoningCostPer1MTokens"
> & {
  /** Cost per 1M thinking tokens produced by Gemini 2.5 models. */
  thinkingCostPer1MTokens?: number | null;
};

/**
 * Gemini-specific usage shape. Uses `thinkingTokens` (matching Gemini's
 * `thoughtsTokenCount`) instead of the generic SDK `reasoningTokens`.
 */
export type GeminiAiEventUsage = Omit<AiEventUsage, "reasoningTokens"> & {
  /** Thinking tokens produced by Gemini 2.5 models (from `usageMetadata.thoughtsTokenCount`) */
  thinkingTokens?: number | null;
};

export type WithStreamTracking<T> = T & {
  fluxGateCostTrackingResponse: FluxGateCostTrackingResponse | undefined;
};

export type TrackedGeminiClient = Omit<GoogleGenAI, "models" | "chats"> & {
  models: Omit<
    GoogleGenAI["models"],
    "generateContent" | "generateContentStream" | "embedContent"
  > & {
    generateContent(
      params: GenerateContentParameters,
    ): Promise<WithTracking<GenerateContentResponse>>;

    generateContentStream(
      params: GenerateContentParameters,
    ): Promise<TrackedStream<GenerateContentResponse>>;

    embedContent(
      params: EmbedContentParameters,
    ): Promise<WithTracking<EmbedContentResponse>>;
  };

  chats: Omit<GoogleGenAI["chats"], "create"> & {
    create(params: CreateChatParameters): TrackedChat;
  };
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
  /** Override per-token pricing used for cost calculation */
  costOverride?: GeminiCostOverride;
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
