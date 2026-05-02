export interface TokenUsage {
    prompt: number;
    completion: number;
    total: number;
}
export interface TokenTracker {
    track(input: unknown, output: unknown): TokenUsage;
}
export type TrackingContext = {
    feature?: string;
    user?: string;
};
