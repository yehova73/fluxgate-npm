import { AiEventStatus, FluxGate, WithTracking } from "@fluxgate/sdk";
import type OpenAI from "openai";
import { extractResponseUsage } from "../utils/extractUsage.js";
import { isAsyncIterable } from "../utils/utils.js";
import { TrackedStream } from "./TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../utils/recordUsage.js";
import { FluxGateContext } from "../types/types.js";

type OrigCreate = OpenAI["responses"]["create"];
type Response = OpenAI.Responses.Response;
type ResponseStreamEvent = OpenAI.Responses.ResponseStreamEvent;

export function createResponsesWrapper(
  original: OrigCreate,
  instance: FluxGate,
  context: FluxGateContext | undefined,
  provider: string,
  region: string | undefined,
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
        instance,
        model: params.model?.toString() ?? "",
        latencyMs: performance.now() - start,
        streaming: !!params.stream,
        context,
        usage: extractResponseUsage(undefined),
        status: "ERROR",
        errorMessage: (err as Error).message,
        provider,
        region,
        serviceTier: params.service_tier,
        requestUser: params.user ?? undefined,
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
          const response = (
            completedEvent?.type === "response.completed"
              ? completedEvent.response
              : undefined
          ) as Response | undefined;
          const { status, errorMessage } = streamError
            ? {
                status: "ERROR" as AiEventStatus,
                errorMessage: streamError.message,
              }
            : !completedEvent
              ? {
                  status: "ERROR" as AiEventStatus,
                  errorMessage:
                    "Stream ended without a response.completed event",
                }
              : extractResponseStatus(response);
          return recordUsage({
            instance,
            model: params.model?.toString() ?? "",
            latencyMs: performance.now() - start,
            streaming: true,
            context,
            usage: extractResponseUsage(response?.usage),
            status,
            errorMessage,
            provider,
            region,
            serviceTier: response?.service_tier ?? params.service_tier,
            requestUser: params.user ?? undefined,
          });
        },
      );
    }

    const response = res as Response;
    const { status, errorMessage } = extractResponseStatus(response);
    const fluxGateCostTrackingResponse = await recordUsage({
      instance,
      model: params.model?.toString() ?? "",
      latencyMs: performance.now() - start,
      streaming: false,
      context,
      usage: extractResponseUsage(response?.usage),
      status,
      errorMessage,
      provider,
      region,
      serviceTier: response?.service_tier ?? params.service_tier,
      requestUser: params.user ?? undefined,
    });
    return Object.assign(response, { fluxGateCostTrackingResponse });
  };
}
