import type { AiEventUsage } from "@fluxgate/sdk";

type AnthropicUsage = {
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export function extractAnthropicUsage(
  usage: AnthropicUsage | null | undefined,
): AiEventUsage {
  if (!usage) {
    return {
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  return {
    promptTokens: usage.input_tokens ?? 0,
    completionTokens: usage.output_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens || undefined,
    cacheReadTokens: usage.cache_read_input_tokens || undefined,
  };
}
