import { describe, it, expect } from "vitest";
import { extractAnthropicUsage } from "./extractUsage.js";

describe("extractAnthropicUsage", () => {
  describe("valid usage data", () => {
    it("should extract usage from complete usage object", () => {
      const usage = {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 20,
        cache_read_input_tokens: 10,
      };

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 30,
        totalTokens: 150,
      });
    });

    it("should handle missing cached token fields", () => {
      const usage = {
        input_tokens: 100,
        output_tokens: 50,
      };

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 0,
        totalTokens: 150,
      });
    });

    it("should handle null cached token fields", () => {
      const usage = {
        input_tokens: 120,
        output_tokens: 30,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      };

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        inputTokens: 120,
        outputTokens: 30,
        cachedTokens: 0,
        totalTokens: 150,
      });
    });
  });

  describe("missing or incomplete data", () => {
    it("should return zero values for null usage", () => {
      const result = extractAnthropicUsage(null);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should return zero values for undefined usage", () => {
      const result = extractAnthropicUsage(undefined);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should handle partial usage object", () => {
      const usage = {
        input_tokens: 80,
        output_tokens: undefined,
      } as any;

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        inputTokens: 80,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 80,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle zero tokens", () => {
      const usage = {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      };

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should handle very large token counts", () => {
      const usage = {
        input_tokens: 1000000,
        output_tokens: 500000,
        cache_creation_input_tokens: 200000,
        cache_read_input_tokens: 100000,
      };

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        inputTokens: 1000000,
        outputTokens: 500000,
        cachedTokens: 300000,
        totalTokens: 1500000,
      });
    });
  });
});
