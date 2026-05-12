import type {
  EnhancedGenerateContentResponse,
  GenerateContentResult,
} from "@google/generative-ai";
import { ExtractedUsage } from "@fluxgate/sdk";

export function extractGeminiUsage(
  result: GenerateContentResult | undefined,
): ExtractedUsage {
  if (!result?.response?.usageMetadata) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  const usage = result.response.usageMetadata;

  return {
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
    cachedTokens: usage.cachedContentTokenCount ?? 0,
    totalTokens: usage.totalTokenCount ?? 0,
  };
}

export function extractGeminiUsageFromChunk(
  chunk: EnhancedGenerateContentResponse | undefined,
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
