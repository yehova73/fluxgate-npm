import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { withOpenAITracking } from "./wrapper/createWrappedClient.js";
import { AiEventMetadata } from "../../tokentracker/dist/types/types.js";
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

export type { AiEventMetadata, TrackedUser } from "../../tokentracker/dist/types/types.js";
export type {
  TrackLlmResponse,
  WithTracking,
  TrackedOpenAI,
} from "./types/types.js";
export { TrackedStream } from "./wrapper/TrackedStream.js";
