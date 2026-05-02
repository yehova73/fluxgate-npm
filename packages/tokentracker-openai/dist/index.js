import { createTracker, } from "@llmwatch/tokentracker";
export function createOpenAITokenTracker() {
    return {
        track(input, output) {
            const usage = output?.usage;
            console.log("Token usage:", usage);
            const tracker = createTracker();
            console.log("Tracking tokens...", tracker);
            return {
                prompt: usage?.prompt_tokens ?? 0,
                completion: usage?.completion_tokens ?? 0,
                total: usage?.total_tokens ?? 0,
            };
        },
    };
}
