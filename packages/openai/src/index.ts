import { FluxGate } from "@fluxgate/sdk";
import type OpenAI from "openai";
import { withOpenAITracking } from "./wrappers/createWrappedClient.js";
import { TrackedOpenAI, FluxGateContext } from "./types/types.js";

export type OpenAITracker = {
  withContext: (ctx: FluxGateContext) => TrackedOpenAI;
  get client(): TrackedOpenAI;
};

export function createOpenAICostTracker(
  client: OpenAI,
  instance: FluxGate,
): OpenAITracker {
  return {
    withContext(ctx: FluxGateContext) {
      return withOpenAITracking(client, instance, ctx);
    },

    // optional: no-context default
    get client() {
      return withOpenAITracking(client, instance);
    },
  };
}

export type {
  TrackedUser,
  FluxGateCostTrackingResponse,
  WithTracking,
  AiEventStatus,
  AiEventMetadata,
  CostOverride,
  Performance,
} from "@fluxgate/sdk";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
