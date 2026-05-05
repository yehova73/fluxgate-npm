import {
  AiEventMetadata,
  AiEventStatus,
  Tracker,
  WithTracking,
} from "@llmwatch/tokentracker";
import type OpenAI from "openai";
import { extractResponseUsage } from "../utils/extractUsage.js";
import { isAsyncIterable } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../utils/recordUsage.js";

type OrigCreate = OpenAI["responses"]["create"];
type Response = OpenAI.Responses.Response;
type ResponseStreamEvent = OpenAI.Responses.ResponseStreamEvent;

export function createResponsesWrapper(
  original: OrigCreate,
  tracker: Tracker,
  context: AiEventMetadata | undefined,
) {
  return async function wrappedResponsesCreate(
    params: Parameters<OrigCreate>[0],
    options?: Parameters<OrigCreate>[1],
  ): Promise<WithTracking<Response> | TrackedStream<ResponseStreamEvent>> {
    const start = performance.now();

    let res: Awaited<ReturnType<OrigCreate>>;
    try {
      res = await original(params, options);
    } catch (err) {
      await recordUsage({
        tracker,
        model: params.model?.toString() ?? "",
        latencyMs: performance.now() - start,
        streaming: !!params.stream,
        context,
        usage: extractResponseUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
      });
      throw err;
    }

    if (params.stream && isAsyncIterable(res)) {
      // Wrap source to capture the response.completed event,
      // which carries usage data and may not be the final event.
      let completedEvent: ResponseStreamEvent | undefined;
      const trackingSource = (async function* () {
        for await (const event of res) {
          if (event?.type === "response.completed") completedEvent = event;
          yield event as ResponseStreamEvent;
        }
      })();

      return new TrackedStream<ResponseStreamEvent>(
        trackingSource,
        (_last, streamError) => {
          const response = (completedEvent?.type === "response.completed" ? completedEvent.response : undefined) as Response | undefined;
          const { status, errorMessage } = streamError
            ? {
                status: "ERROR" as AiEventStatus,
                errorMessage: streamError.message,
              }
            : extractResponseStatus(response);
          return recordUsage({
            tracker,
            model: params.model?.toString() ?? "",
            latencyMs: performance.now() - start,
            streaming: true,
            context,
            usage: extractResponseUsage(response?.usage),
            status,
            errorMessage,
          });
        },
      );
    }

    const response = res as Response;
    const { status, errorMessage } = extractResponseStatus(response);
    const trackLlmResponse = await recordUsage({
      tracker,
      model: params.model ?? "",
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractResponseUsage(response?.usage),
      status,
      errorMessage,
    });
    return Object.assign(response, { trackLlmResponse });
  };
}
