import { Tracker, AiEventMetadata, WithTracking } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
type OrigCreate = OpenAI["embeddings"]["create"];
type CreateEmbeddingResponse = OpenAI.CreateEmbeddingResponse;
export declare function createEmbeddingsWrapper(original: OrigCreate, tracker: Tracker, context: AiEventMetadata | undefined): (params: Parameters<OrigCreate>[0]) => Promise<WithTracking<CreateEmbeddingResponse>>;
export {};
