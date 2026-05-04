import { extractEmbeddingUsage } from "../../utils/extractUsage.js";
import { recordUsage } from "../recordUsage.js";
export function createEmbeddingsWrapper(original, tracker, context) {
    return async function wrappedEmbeddingsCreate(params) {
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
                streaming: false,
                context,
                usage: extractEmbeddingUsage(undefined),
                status: "ERROR",
                errorMessage: err.message,
            });
            throw err;
        }
        const trackLlmResponse = await recordUsage({
            tracker,
            model: params.model,
            latencyMs: performance.now() - start,
            streaming: false,
            context,
            usage: extractEmbeddingUsage(res?.usage),
            status: "SUCCESS",
        });
        return Object.assign(res, { trackLlmResponse });
    };
}
