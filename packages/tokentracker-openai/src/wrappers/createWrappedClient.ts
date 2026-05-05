import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "@llmwatch/tokentracker";
import { TrackedOpenAI } from "../types/types.js";
import { createCompletionsWrapper } from "./completions.js";
import { createChatWrapper } from "./chatCompletions.js";
import { createResponsesWrapper } from "./responses.js";
import { createEmbeddingsWrapper } from "./embeddings.js";

export function withOpenAITracking(
  client: OpenAI,
  tracker: Tracker,
  context?: AiEventMetadata,
): TrackedOpenAI {
  // Create a new object that inherits from the client to avoid mutating the original
  const wrappedClient = Object.create(
    Object.getPrototypeOf(client),
    Object.getOwnPropertyDescriptors(client),
  );

  // Copy nested objects to allow independent wrapping
  wrappedClient.completions = Object.create(
    Object.getPrototypeOf(client.completions),
    Object.getOwnPropertyDescriptors(client.completions),
  );
  wrappedClient.chat = Object.create(
    Object.getPrototypeOf(client.chat),
    Object.getOwnPropertyDescriptors(client.chat),
  );
  wrappedClient.chat.completions = Object.create(
    Object.getPrototypeOf(client.chat.completions),
    Object.getOwnPropertyDescriptors(client.chat.completions),
  );
  wrappedClient.responses = Object.create(
    Object.getPrototypeOf(client.responses),
    Object.getOwnPropertyDescriptors(client.responses),
  );
  wrappedClient.embeddings = Object.create(
    Object.getPrototypeOf(client.embeddings),
    Object.getOwnPropertyDescriptors(client.embeddings),
  );

  wrappedClient.completions.create = createCompletionsWrapper(
    client.completions.create.bind(client.completions),
    tracker,
    context,
  ) as unknown as typeof client.completions.create;
  wrappedClient.chat.completions.create = createChatWrapper(
    client.chat.completions.create.bind(client.chat.completions),
    tracker,
    context,
  ) as unknown as typeof client.chat.completions.create;
  wrappedClient.responses.create = createResponsesWrapper(
    client.responses.create.bind(client.responses),
    tracker,
    context,
  ) as unknown as typeof client.responses.create;
  wrappedClient.embeddings.create = createEmbeddingsWrapper(
    client.embeddings.create.bind(client.embeddings),
    tracker,
    context,
  ) as unknown as typeof client.embeddings.create;

  return wrappedClient as unknown as TrackedOpenAI;
}
