import { withOpenAITracking } from "./wrappers/createWrappedClient.js";
export function createOpenAITokenTracker(client, tracker) {
    return {
        withContext(ctx) {
            return withOpenAITracking(client, tracker, ctx);
        },
        // optional: no-context default
        get client() {
            return withOpenAITracking(client, tracker);
        },
    };
}
export * from "./types/types.js";
export { TrackedStream } from "./wrappers/TrackedStream.js";
