import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { TrackingContext } from "./types/types.js";
import { withOpenAITracking } from "./wrapper/createWrappedClient.js";

type OpenAITracker = {
  withContext: (ctx: TrackingContext) => OpenAI;
  client: OpenAI;
};

export function createOpenAITokenTracker(
  client: OpenAI,
  tracker: Tracker,
): OpenAITracker {
  return {
    withContext(ctx: TrackingContext) {
      return withOpenAITracking(client, tracker, ctx);
    },

    // optional: no-context default
    client: withOpenAITracking(client, tracker),
  };
}

export type { TrackingContext } from "./types/types.js";
