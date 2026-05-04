import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "../../../tokentracker/dist/types/types.js";
import { TrackedOpenAI } from "../types/types.js";
import { createCompletionsWrapper } from "./wrappers/completions.js";
import { createChatWrapper } from "./wrappers/chatCompletions.js";
import { createResponsesWrapper } from "./wrappers/responses.js";
import { createEmbeddingsWrapper } from "./wrappers/embeddings.js";

export function withOpenAITracking(
  client: OpenAI,
  tracker: Tracker,
  context?: AiEventMetadata,
): TrackedOpenAI {
  client.completions.create = createCompletionsWrapper(
    client.completions.create.bind(client.completions),
    tracker,
    context,
  ) as unknown as typeof client.completions.create;
  client.chat.completions.create = createChatWrapper(
    client.chat.completions.create.bind(client.chat.completions),
    tracker,
    context,
  ) as unknown as typeof client.chat.completions.create;
  client.responses.create = createResponsesWrapper(
    client.responses.create.bind(client.responses),
    tracker,
    context,
  ) as unknown as typeof client.responses.create;
  client.embeddings.create = createEmbeddingsWrapper(
    client.embeddings.create.bind(client.embeddings),
    tracker,
    context,
  ) as unknown as typeof client.embeddings.create;

  return client as unknown as TrackedOpenAI;
}
