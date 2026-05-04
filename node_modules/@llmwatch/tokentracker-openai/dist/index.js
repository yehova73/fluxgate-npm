import { withOpenAITracking } from "./wrapper/createWrappedClient.js";
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
export { TrackedStream } from "./wrapper/TrackedStream.js";
