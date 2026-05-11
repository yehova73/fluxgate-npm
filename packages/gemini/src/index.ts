import { AiEventMetadata, FluxGate } from "@fluxgate/sdk";
import type { GenerativeModel } from "@google/generative-ai";
import { withGeminiTracking } from "./wrappers/createWrappedClient.js";

import { TrackedGenerativeModel } from "./types/types.js";

type GeminiTracker = {
  withContext: (ctx: AiEventMetadata) => TrackedGenerativeModel;
  get model(): TrackedGenerativeModel;
};

export function createGeminiCostTracker(
  model: GenerativeModel,
  instance: FluxGate,
): GeminiTracker {
  return {
    withContext(ctx: AiEventMetadata) {
      return withGeminiTracking(model, instance, ctx);
    },

    // optional: no-context default
    get model() {
      return withGeminiTracking(model, instance);
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
