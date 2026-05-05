import { Tracker, AiEventMetadata, WithTracking } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { TrackedStream } from "../TrackedStream.js";
type OrigCreate = OpenAI["chat"]["completions"]["create"];
type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
type ChatChunk = OpenAI.Chat.Completions.ChatCompletionChunk;
export declare function createChatWrapper(original: OrigCreate, tracker: Tracker, context: AiEventMetadata | undefined): (params: Parameters<OrigCreate>[0]) => Promise<WithTracking<ChatCompletion> | TrackedStream<ChatChunk>>;
export {};
