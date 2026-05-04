import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "../../../tokentracker/dist/types/types.js";
import { TrackedOpenAI } from "../types/types.js";
export declare function withOpenAITracking(client: OpenAI, tracker: Tracker, context?: AiEventMetadata): TrackedOpenAI;
