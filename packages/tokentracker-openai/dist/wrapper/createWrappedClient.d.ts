import type OpenAI from "openai";
import { Tracker } from "@llmwatch/tokentracker";
import { TrackingContext } from "../types/types";
export declare function withOpenAITracking(client: OpenAI, tracker: Tracker, context?: TrackingContext): OpenAI;
