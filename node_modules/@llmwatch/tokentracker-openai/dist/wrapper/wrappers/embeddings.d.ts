import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "../../../../tokentracker/dist/types/types.js";
import { WithTracking } from "../../types/types.js";
type OrigCreate = OpenAI["embeddings"]["create"];
type CreateEmbeddingResponse = OpenAI.CreateEmbeddingResponse;
export declare function createEmbeddingsWrapper(original: OrigCreate, tracker: Tracker, context: AiEventMetadata | undefined): (params: Parameters<OrigCreate>[0]) => Promise<WithTracking<CreateEmbeddingResponse>>;
export {};
