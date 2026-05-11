import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import type OpenAI from "openai";
import { withOpenAITracking } from "./wrappers/createWrappedClient.js";
import { TrackedOpenAI } from "./types/types.js";

type OpenAITracker = {
  withContext: (ctx: AiEventMetadata) => TrackedOpenAI;
  get client(): TrackedOpenAI;
};

export function createOpenAICostTracker(
  client: OpenAI,
  instance: FluxGate,
): OpenAITracker {
  return {
    withContext(ctx: AiEventMetadata) {
      return withOpenAITracking(client, instance, ctx);
    },

    // optional: no-context default
    get client() {
      return withOpenAITracking(client, instance);
    },
  };
}

export type {
  AiEventMetadata,
  TrackedUser,
  FluxGateCostTrackingResponse,
  WithTracking,
} from "@fluxgate/sdk";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
