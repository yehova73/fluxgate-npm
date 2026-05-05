import OpenAI from "openai";
import { ExtractedUsage } from "@llmwatch/tokentracker";

export function extractChatUsage(
  usage: OpenAI.Completions.CompletionUsage | null | undefined,
): ExtractedUsage {
  if (!usage) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
  };
}

export function extractResponseUsage(
  usage: OpenAI.Responses.ResponseUsage | null | undefined,
): ExtractedUsage {
  if (!usage) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  return {
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cachedTokens: usage.input_tokens_details?.cached_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0,
  };
}

export function extractEmbeddingUsage(
  usage: OpenAI.Embeddings.CreateEmbeddingResponse["usage"] | null | undefined,
): ExtractedUsage {
  if (!usage) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
    };
  }

  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: 0, // embeddings have no output tokens
    cachedTokens: 0, // not exposed in embeddings
    totalTokens: usage.total_tokens ?? 0,
  };
}
