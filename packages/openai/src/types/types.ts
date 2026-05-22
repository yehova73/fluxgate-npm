import type OpenAI from "openai";
import type {
  WithTracking,
  TrackedUser,
  AiEventMetadata,
  CostOverride,
} from "@fluxgate/sdk";
import type { TrackedStream } from "../wrappers/TrackedStream.js";

/** Utility: intersects any SDK response type with fluxGateCostTrackingResponse */

// Shorthand for the options parameter shared by all create overloads
type ChatOpts = Parameters<OpenAI["chat"]["completions"]["create"]>[1];
type CompletionOpts = Parameters<OpenAI["completions"]["create"]>[1];
type ResponseOpts = Parameters<OpenAI["responses"]["create"]>[1];
type EmbeddingOpts = Parameters<OpenAI["embeddings"]["create"]>[1];

/**
 * An OpenAI client where every `create` call returns tracking data alongside
 * the normal SDK response.
 */
export type TrackedOpenAI = Omit<
  OpenAI,
  "chat" | "completions" | "responses" | "embeddings"
> & {
  chat: Omit<OpenAI["chat"], "completions"> & {
    completions: Omit<OpenAI["chat"]["completions"], "create"> & {
      create(
        body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
        options?: ChatOpts,
      ): Promise<WithTracking<OpenAI.Chat.Completions.ChatCompletion>>;
      create(
        body: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
        options?: ChatOpts,
      ): Promise<TrackedStream<OpenAI.Chat.Completions.ChatCompletionChunk>>;
      create(
        body: OpenAI.Chat.Completions.ChatCompletionCreateParams,
        options?: ChatOpts,
      ): Promise<
        | WithTracking<OpenAI.Chat.Completions.ChatCompletion>
        | TrackedStream<OpenAI.Chat.Completions.ChatCompletionChunk>
      >;
    };
  };
  completions: Omit<OpenAI["completions"], "create"> & {
    create(
      body: OpenAI.CompletionCreateParamsNonStreaming,
      options?: CompletionOpts,
    ): Promise<WithTracking<OpenAI.Completions.Completion>>;
    create(
      body: OpenAI.CompletionCreateParamsStreaming,
      options?: CompletionOpts,
    ): Promise<TrackedStream<OpenAI.Completions.Completion>>;
    create(
      body: OpenAI.CompletionCreateParams,
      options?: CompletionOpts,
    ): Promise<
      | WithTracking<OpenAI.Completions.Completion>
      | TrackedStream<OpenAI.Completions.Completion>
    >;
  };
  responses: Omit<OpenAI["responses"], "create"> & {
    create(
      body: OpenAI.Responses.ResponseCreateParamsNonStreaming,
      options?: ResponseOpts,
    ): Promise<WithTracking<OpenAI.Responses.Response>>;
    create(
      body: OpenAI.Responses.ResponseCreateParamsStreaming,
      options?: ResponseOpts,
    ): Promise<TrackedStream<OpenAI.Responses.ResponseStreamEvent>>;
    create(
      body: OpenAI.Responses.ResponseCreateParams,
      options?: ResponseOpts,
    ): Promise<
      | WithTracking<OpenAI.Responses.Response>
      | TrackedStream<OpenAI.Responses.ResponseStreamEvent>
    >;
  };
  embeddings: Omit<OpenAI["embeddings"], "create"> & {
    create(
      body: OpenAI.EmbeddingCreateParams,
      options?: EmbeddingOpts,
    ): Promise<WithTracking<OpenAI.CreateEmbeddingResponse>>;
  };
};

/**
 * Context passed to `withContext()` to annotate events with user/feature/billing info.
 * Top-level fields map directly to the FluxGate ingest API's event fields.
 */
export type FluxGateContext = {
  /** End-user who triggered the event — plain string ID or a TrackedUser object */
  user?: string | TrackedUser;
  /** Product feature name (e.g. "chat", "summarization") */
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  // /** Explicit total cost in USD from an aggregator proxy (e.g. OpenRouter). Skips server-side cost computation. */
  // openrouterCost?: number;
  /** Override per-token pricing used for cost calculation */
  costOverride?: CostOverride;
  /** Arbitrary key-value pairs forwarded to the metadata object (e.g. { language: "typescript", documentType: "article" }) */
  metadata?: Record<string, unknown>;
};
