import { FluxGate } from "@fluxgate/sdk";
import type Anthropic from "@anthropic-ai/sdk";
import { withAnthropicTracking } from "./wrappers/createWrappedClient.js";
import { TrackedAnthropic } from "./types/types.js";
import { FluxGateContext } from "./types/types.js";

export type AnthropicTracker = {
  withContext: (ctx: FluxGateContext) => TrackedAnthropic;
  get client(): TrackedAnthropic;
};

export function createAnthropicCostTracker(
  client: Anthropic,
  instance: FluxGate,
): AnthropicTracker {
  return {
    withContext(ctx: FluxGateContext) {
      return withAnthropicTracking(client, instance, ctx);
    },

    get client() {
      return withAnthropicTracking(client, instance);
    },
  };
}

export type {
  AiEventMetadata,
  UserSession,
  FluxGateCostTrackingResponse,
  WithTracking,
  AiEventStatus,
  Performance,
  CostOverride,
} from "@fluxgate/sdk";
export type {
  FluxGateContext,
  AnthropicCostOverride,
} from "./types/types.js";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
