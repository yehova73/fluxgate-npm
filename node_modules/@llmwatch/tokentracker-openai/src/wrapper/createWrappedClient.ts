import type OpenAI from "openai";
import { Tracker } from "@llmwatch/tokentracker";
import { TrackingContext } from "../types/types";

function recordUsage(
  tracker: Tracker,
  model: string,
  latencyMs: number,
  streaming: boolean,
  context: TrackingContext | undefined,
  usage: any,
) {
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

export function withOpenAITracking(
  client: OpenAI,
  tracker: Tracker,
  context?: TrackingContext,
): OpenAI {
  const originalChatCreate = client.chat.completions.create.bind(
    client.chat.completions,
  );
  const originalResponsesCreate = client.responses.create.bind(
    client.responses,
  );
  const originalEmbeddingsCreate = client.embeddings.create.bind(
    client.embeddings,
  );

  async function wrappedChatCreate(
    params: Parameters<typeof originalChatCreate>[0],
  ): Promise<any> {
    const start = performance.now();

    let res: any;

    try {
      res = await originalChatCreate(params);

      // STREAMING
      if ((params as any).stream) {
        const originalStream = res;

        async function* wrappedStream() {
          let lastChunk: any;

          for await (const chunk of originalStream) {
            lastChunk = chunk;
            yield chunk;
          }

          recordUsage(
            tracker,
            params.model,
            performance.now() - start,
            true,
            context,
            lastChunk?.usage,
          );
        }

        return wrappedStream() as any;
      }

      return res;
    } finally {
      if (!(params as any).stream) {
        recordUsage(
          tracker,
          params.model,
          performance.now() - start,
          false,
          context,
          res?.usage,
        );
      }
    }
  }

  async function wrappedResponsesCreate(
    params: Parameters<typeof originalResponsesCreate>[0],
  ): Promise<any> {
    const start = performance.now();
    const res: any = await originalResponsesCreate(params);

    // STREAMING
    if ((params as any).stream) {
      const originalStream = res;

      async function* wrappedStream() {
        let completedEvent: any;

        for await (const event of originalStream) {
          if (event?.type === "response.completed") {
            completedEvent = event;
          }
          yield event;
        }

        recordUsage(
          tracker,
          params.model?.toString() ?? "",
          performance.now() - start,
          true,
          context,
          completedEvent?.response?.usage,
        );
      }

      return wrappedStream() as any;
    }

    recordUsage(
      tracker,
      params.model?.toString() ?? "",
      performance.now() - start,
      false,
      context,
      res?.usage,
    );

    return res;
  }

  async function wrappedEmbeddingsCreate(
    params: Parameters<typeof originalEmbeddingsCreate>[0],
  ): Promise<any> {
    const start = performance.now();
    const res = await originalEmbeddingsCreate(params);

    recordUsage(
      tracker,
      params.model,
      performance.now() - start,
      false,
      context,
      res?.usage,
    );

    return res;
  }

  client.chat.completions.create =
    wrappedChatCreate as typeof originalChatCreate;
  client.responses.create =
    wrappedResponsesCreate as typeof originalResponsesCreate;
  client.embeddings.create =
    wrappedEmbeddingsCreate as typeof originalEmbeddingsCreate;

  return client;
}
