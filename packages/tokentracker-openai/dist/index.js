import { withOpenAITracking } from "./wrapper/createWrappedClient.js";
export function createOpenAITokenTracker(client, tracker) {
    return {
        withContext(ctx) {
            return withOpenAITracking(client, tracker, ctx);
        },
        // optional: no-context default
        client: withOpenAITracking(client, tracker),
    };
}
