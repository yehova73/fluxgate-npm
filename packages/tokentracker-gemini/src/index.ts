import { AiEventMetadata, Tracker } from "@llmwatch/tokentracker";
import type { GenerativeModel } from "@google/generative-ai";
import { withGeminiTracking } from "./wrappers/createWrappedClient.js";

import { TrackedGenerativeModel } from "./types/types.js";

type GeminiTracker = {
  withContext: (ctx: AiEventMetadata) => TrackedGenerativeModel;
  get model(): TrackedGenerativeModel;
};

export function createGeminiTokenTracker(
  model: GenerativeModel,
  tracker: Tracker,
): GeminiTracker {
  return {
    withContext(ctx: AiEventMetadata) {
      return withGeminiTracking(model, tracker, ctx);
    },

    // optional: no-context default
    get model() {
      return withGeminiTracking(model, tracker);
    },
  };
}

export type {
  AiEventMetadata,
  TrackedUser,
  TrackLlmResponse,
  WithTracking,
} from "@llmwatch/tokentracker";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
