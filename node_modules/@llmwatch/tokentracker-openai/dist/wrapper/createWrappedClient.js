function recordUsage(tracker, model, latencyMs, streaming, context, usage) {
    tracker.record({
        provider: "openai",
        model,
        latencyMs,
        streaming,
        feature: context?.feature,
        userId: context?.user,
        usage: usage && {
            prompt: usage.prompt_tokens ?? usage.input_tokens ?? 0,
            completion: usage.completion_tokens ?? usage.output_tokens ?? 0,
            total: usage.total_tokens ?? 0,
        },
    });
}
export function withOpenAITracking(client, tracker, context) {
    const originalChatCreate = client.chat.completions.create.bind(client.chat.completions);
    const originalResponsesCreate = client.responses.create.bind(client.responses);
    const originalEmbeddingsCreate = client.embeddings.create.bind(client.embeddings);
    async function wrappedChatCreate(params) {
        const start = performance.now();
        let res;
        try {
            res = await originalChatCreate(params);
            // STREAMING
            if (params.stream) {
                const originalStream = res;
                async function* wrappedStream() {
                    let lastChunk;
                    for await (const chunk of originalStream) {
                        lastChunk = chunk;
                        yield chunk;
                    }
                    recordUsage(tracker, params.model, performance.now() - start, true, context, lastChunk?.usage);
                }
                return wrappedStream();
            }
            return res;
        }
        finally {
            if (!params.stream) {
                recordUsage(tracker, params.model, performance.now() - start, false, context, res?.usage);
            }
        }
    }
    async function wrappedResponsesCreate(params) {
        const start = performance.now();
        const res = await originalResponsesCreate(params);
        // STREAMING
        if (params.stream) {
            const originalStream = res;
            async function* wrappedStream() {
                let completedEvent;
                for await (const event of originalStream) {
                    if (event?.type === "response.completed") {
                        completedEvent = event;
                    }
                    yield event;
                }
                recordUsage(tracker, params.model?.toString() ?? "", performance.now() - start, true, context, completedEvent?.response?.usage);
            }
            return wrappedStream();
        }
        recordUsage(tracker, params.model?.toString() ?? "", performance.now() - start, false, context, res?.usage);
        return res;
    }
    async function wrappedEmbeddingsCreate(params) {
        const start = performance.now();
        const res = await originalEmbeddingsCreate(params);
        recordUsage(tracker, params.model, performance.now() - start, false, context, res?.usage);
        return res;
    }
    client.chat.completions.create =
        wrappedChatCreate;
    client.responses.create =
        wrappedResponsesCreate;
    client.embeddings.create =
        wrappedEmbeddingsCreate;
    return client;
}
