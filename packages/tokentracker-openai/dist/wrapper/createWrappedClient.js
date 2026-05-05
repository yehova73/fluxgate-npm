import { createCompletionsWrapper } from "./completions.js";
import { createChatWrapper } from "./chatCompletions.js";
import { createResponsesWrapper } from "./responses.js";
import { createEmbeddingsWrapper } from "./embeddings.js";
export function withOpenAITracking(client, tracker, context) {
    client.completions.create = createCompletionsWrapper(client.completions.create.bind(client.completions), tracker, context);
    client.chat.completions.create = createChatWrapper(client.chat.completions.create.bind(client.chat.completions), tracker, context);
    client.responses.create = createResponsesWrapper(client.responses.create.bind(client.responses), tracker, context);
    client.embeddings.create = createEmbeddingsWrapper(client.embeddings.create.bind(client.embeddings), tracker, context);
    return client;
}
