import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParams,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import type {
  Completion,
  CompletionCreateParams,
  CompletionCreateParamsNonStreaming,
  CompletionCreateParamsStreaming,
} from "@anthropic-ai/sdk/resources/completions";
import type {
  BetaMessage,
  BetaRawMessageStreamEvent,
  MessageCreateParams as BetaMessageCreateParams,
  MessageCreateParamsNonStreaming as BetaMessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming as BetaMessageCreateParamsStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { WithTracking, UserSession, CostOverride } from "@fluxgate/sdk";
import type { TrackedStream } from "../wrappers/TrackedStream.js";

type MessageCreateOptions = Parameters<Anthropic["messages"]["create"]>[1];
type CompletionCreateOptions = Parameters<
  Anthropic["completions"]["create"]
>[1];
type BetaMessageCreateOptions = Parameters<
  Anthropic["beta"]["messages"]["create"]
>[1];

/**
 * Anthropic-specific cost override.
 * Excludes `reasoningCostPer1MTokens` — extended thinking tokens are billed as
 * standard output tokens in the Anthropic API.
 * All rates are per 1 million tokens in USD.
 */
export type AnthropicCostOverride = Omit<
  CostOverride,
  "reasoningCostPer1MTokens"
>;

/**
 * The tracked `messages` namespace. Has the same `create` overloads as the
 * Anthropic SDK plus a `withTracking` method to fork the context per-call.
 */
export type TrackedMessages = Omit<Anthropic["messages"], "create"> & {
  create(
    body: MessageCreateParamsNonStreaming,
    options?: MessageCreateOptions,
  ): Promise<WithTracking<Message>>;
  create(
    body: MessageCreateParamsStreaming,
    options?: MessageCreateOptions,
  ): Promise<TrackedStream<RawMessageStreamEvent>>;
  create(
    body: MessageCreateParams,
    options?: MessageCreateOptions,
  ): Promise<WithTracking<Message> | TrackedStream<RawMessageStreamEvent>>;
  /**
   * Fork the tracking context for a single call (or chain of calls).
   * The new context is shallowly merged on top of the existing one.
   *
   * @example
   * await session.messages.withTracking({ step: "second-turn" }).create({ ... })
   */
  withTracking(ctx: FluxGateContext): TrackedMessages;
};

/**
 * The tracked `beta.messages` namespace, with the same `withTracking` fork.
 */
export type TrackedBetaMessages = Omit<
  Anthropic["beta"]["messages"],
  "create"
> & {
  create(
    params: BetaMessageCreateParamsNonStreaming,
    options?: BetaMessageCreateOptions,
  ): Promise<WithTracking<BetaMessage>>;
  create(
    params: BetaMessageCreateParamsStreaming,
    options?: BetaMessageCreateOptions,
  ): Promise<TrackedStream<BetaRawMessageStreamEvent>>;
  create(
    params: BetaMessageCreateParams,
    options?: BetaMessageCreateOptions,
  ): Promise<
    WithTracking<BetaMessage> | TrackedStream<BetaRawMessageStreamEvent>
  >;
  /** Fork the tracking context for a single call. */
  withTracking(ctx: FluxGateContext): TrackedBetaMessages;
};

/**
 * An Anthropic client where every `create` call returns tracking data alongside
 * the normal SDK response.
 */
export type TrackedAnthropic = Omit<
  Anthropic,
  "messages" | "completions" | "beta"
> & {
  messages: TrackedMessages;
  completions: Omit<Anthropic["completions"], "create"> & {
    create(
      body: CompletionCreateParamsNonStreaming,
      options?: CompletionCreateOptions,
    ): Promise<WithTracking<Completion>>;
    create(
      body: CompletionCreateParamsStreaming,
      options?: CompletionCreateOptions,
    ): Promise<TrackedStream<Completion>>;
    create(
      body: CompletionCreateParams,
      options?: CompletionCreateOptions,
    ): Promise<WithTracking<Completion> | TrackedStream<Completion>>;
  };
  beta: Omit<Anthropic["beta"], "messages"> & {
    messages: TrackedBetaMessages;
  };
};

/**
 * Context passed to `withContext()` to annotate events with user/feature/billing info.
 * Auto-detected fields (region, cacheTtl) are extracted from the request — do not pass them here.
 */
export type FluxGateContext = {
  /** End-user who triggered the event — plain string ID or a UserSession object */
  user?: string | UserSession;
  /** Product feature name (e.g. "chat", "summarization") */
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  /** Override per-token pricing used for cost calculation */
  costOverride?: AnthropicCostOverride;
  /** Arbitrary key-value pairs forwarded to the metadata object (e.g. { language: "typescript", documentType: "article" }) */
  metadata?: Record<string, unknown>;
};
