import type { GenerateContentResponse } from "@google/genai";
import { ExtractedUsage } from "@fluxgate/sdk";

export function extractGeminiUsage(
  result: GenerateContentResponse | undefined,
): ExtractedUsage {
  if (!result?.usageMetadata) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  const usage = result.usageMetadata;

  return {
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    cachedTokens: usage.cachedContentTokenCount ?? 0,
    totalTokens: usage.totalTokenCount ?? 0,
  };
}

// For streaming, each chunk is also a GenerateContentResponse
export function extractGeminiUsageFromChunk(
  chunk: GenerateContentResponse | undefined,
): ExtractedUsage {
  if (!chunk?.usageMetadata) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  const usage = chunk.usageMetadata;

  return {
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    cachedTokens: usage.cachedContentTokenCount ?? 0,
    totalTokens: usage.totalTokenCount ?? 0,
  };
}
