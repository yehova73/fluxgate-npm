import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import type Anthropic from "@anthropic-ai/sdk";
import { withAnthropicTracking } from "./wrappers/createWrappedClient.js";
import { TrackedAnthropic } from "./types/types.js";

export type AnthropicTracker = {
  withContext: (ctx: AiEventMetadata) => TrackedAnthropic;
  get client(): TrackedAnthropic;
};

export function createAnthropicCostTracker(
  client: Anthropic,
  instance: FluxGate,
): AnthropicTracker {
  return {
    withContext(ctx: AiEventMetadata) {
      return withAnthropicTracking(client, instance, ctx);
    },

    get client() {
      return withAnthropicTracking(client, instance);
    },
  };
}

export type {
  AiEventMetadata,
  TrackedUser,
  FluxGateCostTrackingResponse,
  WithTracking,
  AiEventStatus,
} from "@fluxgate/sdk";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
