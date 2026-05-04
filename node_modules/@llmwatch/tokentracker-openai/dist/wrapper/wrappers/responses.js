import { extractResponseUsage } from "../../utils/extractUsage.js";
import { isAsyncIterable } from "../../utils/utils.js";
import { TrackedStream } from "../TrackedStream.js";
import { extractResponseStatus, recordUsage } from "../recordUsage.js";
export function createResponsesWrapper(original, tracker, context) {
    return async function wrappedResponsesCreate(params) {
        const start = performance.now();
        let res;
        try {
            res = await original(params);
        }
        catch (err) {
            await recordUsage({
                tracker,
                model: params.model?.toString() ?? "",
                latencyMs: performance.now() - start,
                streaming: !!params.stream,
                context,
                usage: extractResponseUsage(undefined),
                status: "ERROR",
                errorMessage: err.message,
            });
            throw err;
        }
        if (params.stream && isAsyncIterable(res)) {
            // Wrap source to capture the response.completed event,
            // which carries usage data and may not be the final event.
            let completedEvent;
            const trackingSource = (async function* () {
                for await (const event of res) {
                    if (event?.type === "response.completed")
                        completedEvent = event;
                    yield event;
                }
            })();
            return new TrackedStream(trackingSource, (_last, streamError) => {
                const response = completedEvent?.response;
                const { status, errorMessage } = streamError
                    ? {
                        status: "ERROR",
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
            });
        }
        const response = res;
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
