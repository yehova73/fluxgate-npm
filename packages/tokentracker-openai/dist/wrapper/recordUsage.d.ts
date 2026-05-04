import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata, AiEventStatus } from "../../../tokentracker/dist/types/types.js";
import { ExtractedUsage, TrackLlmResponse } from "../types/types.js";
export declare function recordUsage(params: {
    tracker: Tracker;
    model: string;
    latencyMs: number;
    streaming: boolean;
    context: AiEventMetadata | undefined;
    usage: ExtractedUsage;
    status: AiEventStatus;
    errorMessage?: string;
}): Promise<TrackLlmResponse>;
export declare function finishReasonToStatus(finishReason: string | null | undefined): AiEventStatus;
export declare function extractResponseStatus(response: OpenAI.Responses.Response | undefined): {
    status: AiEventStatus;
    errorMessage?: string;
};
