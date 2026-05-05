import { AiEventMetadata, Tracker, WithTracking } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { TrackedStream } from "../TrackedStream.js";
type OrigCreate = OpenAI["responses"]["create"];
type Response = OpenAI.Responses.Response;
type ResponseStreamEvent = OpenAI.Responses.ResponseStreamEvent;
export declare function createResponsesWrapper(original: OrigCreate, tracker: Tracker, context: AiEventMetadata | undefined): (params: Parameters<OrigCreate>[0]) => Promise<WithTracking<Response> | TrackedStream<ResponseStreamEvent>>;
export {};
