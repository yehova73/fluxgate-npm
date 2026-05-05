import { AiEventMetadata, Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { withOpenAITracking } from "./wrappers/createWrappedClient.js";
import { TrackedOpenAI } from "./types/types.js";

type OpenAITracker = {
  withContext: (ctx: AiEventMetadata) => TrackedOpenAI;
  get client(): TrackedOpenAI;
};

export function createOpenAITokenTracker(
  client: OpenAI,
  tracker: Tracker,
): OpenAITracker {
  return {
    withContext(ctx: AiEventMetadata) {
      return withOpenAITracking(client, tracker, ctx);
    },

    // optional: no-context default
    get client() {
      return withOpenAITracking(client, tracker);
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
