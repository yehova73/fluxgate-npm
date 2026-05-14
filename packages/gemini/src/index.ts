import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import type { GoogleGenAI } from "@google/genai";
import { withGeminiTracking } from "./wrappers/createWrappedClient.js";
import { TrackedGeminiClient } from "./types/types.js";

export type GeminiTracker = {
  withContext: (ctx: AiEventMetadata) => TrackedGeminiClient;
  get client(): TrackedGeminiClient;
};

export function createGeminiCostTracker(
  ai: GoogleGenAI,
  instance: FluxGate,
): GeminiTracker {
  return {
    withContext(ctx: AiEventMetadata) {
      return withGeminiTracking(ai, instance, ctx);
    },

    // optional: no-context default
    get client() {
      return withGeminiTracking(ai, instance);
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
