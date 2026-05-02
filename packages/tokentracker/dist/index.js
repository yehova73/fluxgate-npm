export function createTracker() {
    return {
        track() {
            return {
                prompt: 0,
                completion: 0,
                total: 0,
            };
        },
    };
}
