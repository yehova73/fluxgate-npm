import { createCompletionsWrapper } from "./wrappers/completions.js";
import { createChatWrapper } from "./wrappers/chatCompletions.js";
import { createResponsesWrapper } from "./wrappers/responses.js";
import { createEmbeddingsWrapper } from "./wrappers/embeddings.js";
export function withOpenAITracking(client, tracker, context) {
    client.completions.create = createCompletionsWrapper(client.completions.create.bind(client.completions), tracker, context);
    client.chat.completions.create = createChatWrapper(client.chat.completions.create.bind(client.chat.completions), tracker, context);
    client.responses.create = createResponsesWrapper(client.responses.create.bind(client.responses), tracker, context);
    client.embeddings.create = createEmbeddingsWrapper(client.embeddings.create.bind(client.embeddings), tracker, context);
    return client;
}
