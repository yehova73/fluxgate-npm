import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "../../tokentracker/dist/types/types.js";
import { TrackedOpenAI } from "./types/types.js";
type OpenAITracker = {
    withContext: (ctx: AiEventMetadata) => TrackedOpenAI;
    get client(): TrackedOpenAI;
};
export declare function createOpenAITokenTracker(client: OpenAI, tracker: Tracker): OpenAITracker;
export type { AiEventMetadata, TrackedUser } from "../../tokentracker/dist/types/types.js";
export type { TrackLlmResponse, WithTracking, TrackedOpenAI, } from "./types/types.js";
export { TrackedStream } from "./wrapper/TrackedStream.js";
