import { TokenUsage } from "./types/types.js";

export function createTracker() {
  return {
    track(): TokenUsage {
      return {
        prompt: 0,
        completion: 0,
        total: 0,
      };
    },
  };
}

export type { TokenTracker, TokenUsage } from "./types/types.js";
