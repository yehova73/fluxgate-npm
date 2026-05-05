import { extractChatUsage } from "../../utils/extractUsage.js";
import { isAsyncIterable } from "../../utils/utils.js";
import { TrackedStream } from "../TrackedStream.js";
import { finishReasonToStatus, recordUsage } from "../../utils/recordUsage.js";
export function createChatWrapper(original, tracker, context) {
    return async function wrappedChatCreate(params) {
        const start = performance.now();
        let res;
        try {
            res = await original(params);
        }
        catch (err) {
            await recordUsage({
                tracker,
                model: params.model,
                latencyMs: performance.now() - start,
                streaming: !!params.stream,
                context,
                usage: extractChatUsage(undefined),
                status: "ERROR",
                errorMessage: err.message,
            });
            throw err;
        }
        if (params.stream && isAsyncIterable(res)) {
            return new TrackedStream(res, (lastChunk, streamError) => recordUsage({
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
            }));
        }
        const completion = res;
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
