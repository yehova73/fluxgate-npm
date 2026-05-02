export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface TokenTracker {
  track(input: unknown, output: unknown): TokenUsage;
}
