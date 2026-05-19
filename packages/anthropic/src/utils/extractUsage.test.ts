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
        promptTokens: 100,
        completionTokens: 50,
        cacheWriteTokens: 20,
        cacheReadTokens: 10,
      });
    });

    it("should handle missing cached token fields", () => {
      const usage = {
        input_tokens: 100,
        output_tokens: 50,
      };

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        promptTokens: 100,
        completionTokens: 50,
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
        promptTokens: 120,
        completionTokens: 30,
      });
    });
  });

  describe("missing or incomplete data", () => {
    it("should return zero values for null usage", () => {
      const result = extractAnthropicUsage(null);

      expect(result).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
    });

    it("should return zero values for undefined usage", () => {
      const result = extractAnthropicUsage(undefined);

      expect(result).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
    });

    it("should handle partial usage object", () => {
      const usage = {
        input_tokens: 80,
        output_tokens: undefined,
      } as any;

      const result = extractAnthropicUsage(usage);

      expect(result).toEqual({
        promptTokens: 80,
        completionTokens: 0,
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
        promptTokens: 0,
        completionTokens: 0,
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
        promptTokens: 1000000,
        completionTokens: 500000,
        cacheWriteTokens: 200000,
        cacheReadTokens: 100000,
      });
    });
  });
});
