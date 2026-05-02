import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { TrackingContext } from "./types/types.js";
type OpenAITracker = {
    withContext: (ctx: TrackingContext) => OpenAI;
    client: OpenAI;
};
export declare function createOpenAITokenTracker(client: OpenAI, tracker: Tracker): OpenAITracker;
export type { TrackingContext } from "./types/types.js";
