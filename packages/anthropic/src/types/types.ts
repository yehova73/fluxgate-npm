import type Anthropic from "@anthropic-ai/sdk";
import type {
  Message,
  MessageCreateParams,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import type { WithTracking } from "@fluxgate/sdk";
import type { TrackedStream } from "../wrappers/TrackedStream.js";

type MessageCreateOptions = Parameters<Anthropic["messages"]["create"]>[1];

export type TrackedAnthropic = Omit<Anthropic, "messages"> & {
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
};
