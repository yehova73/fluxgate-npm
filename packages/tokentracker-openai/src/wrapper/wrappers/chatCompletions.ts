import { Tracker } from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { AiEventMetadata } from "../../../../tokentracker/dist/types/types.js";
import { WithTracking } from "../../types/types.js";
import { extractChatUsage } from "../../utils/extractUsage.js";
import { isAsyncIterable } from "../../utils/utils.js";
import { TrackedStream } from "../TrackedStream.js";
import { finishReasonToStatus, recordUsage } from "../recordUsage.js";

type OrigCreate = OpenAI["chat"]["completions"]["create"];
type ChatCompletion = OpenAI.Chat.Completions.ChatCompletion;
type ChatChunk = OpenAI.Chat.Completions.ChatCompletionChunk;

export function createChatWrapper(
  original: OrigCreate,
  tracker: Tracker,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedChatCreate(
    params: Parameters<OrigCreate>[0],
  ): Promise<WithTracking<ChatCompletion> | TrackedStream<ChatChunk>> {
    const start = performance.now();

    let res: Awaited<ReturnType<OrigCreate>>;
    try {
      res = await (original as any)(params);
    } catch (err) {
      await recordUsage({
        tracker,
        model: params.model,
        latencyMs: performance.now() - start,
        streaming: !!params.stream,
        context,
        usage: extractChatUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    if (params.stream && isAsyncIterable(res)) {
      return new TrackedStream<ChatChunk>(
        res as any,
        (lastChunk, streamError) =>
          recordUsage({
            tracker,
            model: params.model,
            latencyMs: performance.now() - start,
            streaming: true,
            context,
            usage: extractChatUsage(lastChunk?.usage),
            status: streamError
              ? "ERROR"
              : finishReasonToStatus(lastChunk?.choices?.[0]?.finish_reason),
            errorMessage: streamError?.message,
          }),
      );
    }

    const completion = res as ChatCompletion;
    const trackLlmResponse = await recordUsage({
      tracker,
      model: params.model,
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractChatUsage(completion?.usage),
      status: finishReasonToStatus(completion?.choices?.[0]?.finish_reason),
    });
    return Object.assign(completion, { trackLlmResponse });
  };
}
