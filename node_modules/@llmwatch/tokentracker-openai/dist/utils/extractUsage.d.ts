import OpenAI from "openai";
import { ExtractedUsage } from "@llmwatch/tokentracker";
export declare function extractChatUsage(usage: OpenAI.Completions.CompletionUsage | null | undefined): ExtractedUsage;
export declare function extractResponseUsage(usage: OpenAI.Responses.ResponseUsage | null | undefined): ExtractedUsage;
export declare function extractEmbeddingUsage(usage: OpenAI.Embeddings.CreateEmbeddingResponse["usage"] | null | undefined): ExtractedUsage;
