import { FluxGate } from "@fluxgate/sdk";
import type { GoogleGenAI } from "@google/genai";
import { withGeminiTracking } from "./wrappers/createWrappedClient.js";
import { TrackedGeminiClient, FluxGateContext } from "./types/types.js";

export type GeminiTracker = {
  withContext: (ctx: FluxGateContext) => TrackedGeminiClient;
  get client(): TrackedGeminiClient;
};

export function createGeminiCostTracker(
  ai: GoogleGenAI,
  instance: FluxGate,
): GeminiTracker {
  return {
    withContext(ctx: FluxGateContext) {
      return withGeminiTracking(ai, instance, ctx);
    },

    // optional: no-context default
    get client() {
      return withGeminiTracking(ai, instance);
    },
  };
}

export type {
  UserSession,
  FluxGateCostTrackingResponse,
  WithTracking,
  AiEventStatus,
  AiEventMetadata,
  CostOverride,
  Performance,
} from "@fluxgate/sdk";
export type { GeminiCostOverride, GeminiAiEventUsage } from "./types/types.js";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
