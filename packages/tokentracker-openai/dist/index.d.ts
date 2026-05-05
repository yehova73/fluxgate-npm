import { AiEventMetadata, Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { TrackedOpenAI } from "./types/types.js";
type OpenAITracker = {
    withContext: (ctx: AiEventMetadata) => TrackedOpenAI;
    get client(): TrackedOpenAI;
};
export declare function createOpenAITokenTracker(client: OpenAI, tracker: Tracker): OpenAITracker;
export type { AiEventMetadata, TrackedUser, TrackLlmResponse, WithTracking, } from "@llmwatch/tokentracker";
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
