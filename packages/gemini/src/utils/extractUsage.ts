import type { GenerateContentResponse } from "@google/genai";
import { GeminiAiEventUsage } from "../types/types.js";

export function extractGeminiUsage(
  result: GenerateContentResponse | undefined,
): GeminiAiEventUsage {
  if (!result?.usageMetadata) {
    return { promptTokens: 0, completionTokens: 0 };
  }

  const usage = result.usageMetadata;

  return {
    promptTokens: usage.promptTokenCount ?? 0,
    completionTokens: usage.candidatesTokenCount ?? 0,
    cacheReadTokens: usage.cachedContentTokenCount || undefined,
    thinkingTokens: usage.thoughtsTokenCount || undefined,
  };
}

// For streaming, each chunk is also a GenerateContentResponse
export function extractGeminiUsageFromChunk(
  chunk: GenerateContentResponse | undefined,
): GeminiAiEventUsage {
  if (!chunk?.usageMetadata) {
    return { promptTokens: 0, completionTokens: 0 };
  }

  const usage = chunk.usageMetadata;

  return {
    promptTokens: usage.promptTokenCount ?? 0,
    completionTokens: usage.candidatesTokenCount ?? 0,
    cacheReadTokens: usage.cachedContentTokenCount || undefined,
    thinkingTokens: usage.thoughtsTokenCount || undefined,
  };
}
