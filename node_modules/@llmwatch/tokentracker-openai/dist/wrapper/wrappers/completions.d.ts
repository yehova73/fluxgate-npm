import { Tracker, AiEventMetadata, WithTracking } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { TrackedStream } from "../TrackedStream.js";
type OrigCreate = OpenAI["completions"]["create"];
type Completion = OpenAI.Completions.Completion;
export declare function createCompletionsWrapper(original: OrigCreate, tracker: Tracker, context: AiEventMetadata | undefined): (params: Parameters<OrigCreate>[0]) => Promise<WithTracking<Completion> | TrackedStream<Completion>>;
export {};
