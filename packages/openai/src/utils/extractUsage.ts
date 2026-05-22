import OpenAI from "openai";
import { OpenAiEventUsage } from "../types/types.js";

export function extractChatUsage(
  usage: OpenAI.Completions.CompletionUsage | null | undefined,
): OpenAiEventUsage {
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0 };
  }

  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    cacheReadTokens: usage.prompt_tokens_details?.cached_tokens || undefined,
    reasoningTokens:
      usage.completion_tokens_details?.reasoning_tokens || undefined,
  };
}

export function extractResponseUsage(
  usage: OpenAI.Responses.ResponseUsage | null | undefined,
): OpenAiEventUsage {
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0 };
  }

  return {
    promptTokens: usage.input_tokens ?? 0,
    completionTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.input_tokens_details?.cached_tokens || undefined,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens || undefined,
  };
}

export function extractEmbeddingUsage(
  usage: OpenAI.Embeddings.CreateEmbeddingResponse["usage"] | null | undefined,
): OpenAiEventUsage {
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0 };
  }

  return {
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: 0,
  };
}
