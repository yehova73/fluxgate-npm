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
import type {
  WithTracking,
  TrackedUser,
  AiEventMetadata,
  CostOverride,
} from "@fluxgate/sdk";
import type { TrackedStream } from "../wrappers/TrackedStream.js";

type MessageCreateOptions = Parameters<Anthropic["messages"]["create"]>[1];
type CompletionCreateOptions = Parameters<
  Anthropic["completions"]["create"]
>[1];
type BetaMessageCreateOptions = Parameters<
  Anthropic["beta"]["messages"]["create"]
>[1];

export type TrackedAnthropic = Omit<
  Anthropic,
  "messages" | "completions" | "beta"
> & {
  messages: Omit<Anthropic["messages"], "create"> & {
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
  };
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
    messages: Omit<Anthropic["beta"]["messages"], "create"> & {
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
    };
  };
};

export type FluxGateContext = {
  user?: string | TrackedUser;
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  timestamp?: number;
  serviceTier?: AiEventMetadata["serviceTier"];
  region?: string;
  openrouterCost?: number;
  cacheTtl?: string;
  costOverride?: CostOverride;
  /** Arbitrary key-value pairs forwarded to the metadata object (e.g. { language: "typescript", documentType: "article" }) */
  metadata?: Record<string, unknown>;
};
