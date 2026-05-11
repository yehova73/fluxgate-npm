import { describe, it, expect } from "vitest";
import {
  extractChatUsage,
  extractResponseUsage,
  extractEmbeddingUsage,
} from "./extractUsage.js";

describe("extractUsage utilities", () => {
  describe("extractChatUsage", () => {
    it("should extract usage from valid completion usage", () => {
      const usage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        prompt_tokens_details: {
          cached_tokens: 20,
        },
      };

      const result = extractChatUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 20,
        totalTokens: 150,
      });
    });

    it("should handle missing prompt_tokens_details", () => {
      const usage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      };

      const result = extractChatUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 0,
        totalTokens: 150,
      });
    });

    it("should return zero values for null usage", () => {
      const result = extractChatUsage(null);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should return zero values for undefined usage", () => {
      const result = extractChatUsage(undefined);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should handle partial usage data", () => {
      const usage = {
        prompt_tokens: 100,
        completion_tokens: undefined,
        total_tokens: 100,
      } as any;

      const result = extractChatUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 100,
      });
    });
  });

  describe("extractResponseUsage", () => {
    it("should extract usage from valid response usage", () => {
      const usage = {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        output_tokens_details: {
          reasoning_tokens: 20,
        },
        input_tokens_details: {
          cached_tokens: 20,
        },
      };

      const result = extractResponseUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 20,
        totalTokens: 150,
      });
    });

    it("should handle missing input_tokens_details", () => {
      const usage = {
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        input_tokens_details: {
          cached_tokens: 20,
        },
        output_tokens_details: {
          reasoning_tokens: 20,
        },
      };

      const result = extractResponseUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 20,
        totalTokens: 150,
      });
    });

    it("should return zero values for null usage", () => {
      const result = extractResponseUsage(null);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should return zero values for undefined usage", () => {
      const result = extractResponseUsage(undefined);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should handle partial usage data", () => {
      const usage = {
        input_tokens: 100,
        output_tokens: undefined,
        total_tokens: 100,
      } as any;

      const result = extractResponseUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 100,
      });
    });
  });

  describe("extractEmbeddingUsage", () => {
    it("should extract usage from valid embedding usage", () => {
      const usage = {
        prompt_tokens: 100,
        total_tokens: 100,
      };

      const result = extractEmbeddingUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 100,
      });
    });

    it("should return zero values for null usage", () => {
      const result = extractEmbeddingUsage(null);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should return zero values for undefined usage", () => {
      const result = extractEmbeddingUsage(undefined);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should always return zero for output and cached tokens", () => {
      const usage = {
        prompt_tokens: 100,
        total_tokens: 100,
      };

      const result = extractEmbeddingUsage(usage);

      expect(result.outputTokens).toBe(0);
      expect(result.cachedTokens).toBe(0);
    });

    it("should handle partial usage data", () => {
      const usage = {
        prompt_tokens: undefined,
        total_tokens: 0,
      } as any;

      const result = extractEmbeddingUsage(usage);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });
  });
});
