import { describe, it, expect } from "vitest";
import { extractGeminiUsage } from "./extractUsage.js";
import type { GenerateContentResult } from "@google/generative-ai";

describe("extractGeminiUsage", () => {
  describe("valid usage data", () => {
    it("should extract usage from complete result", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            cachedContentTokenCount: 20,
            totalTokenCount: 170,
          },
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 20,
        totalTokens: 170,
      });
    });

    it("should handle missing cached token count", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 50,
            totalTokenCount: 150,
          },
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 0,
        totalTokens: 150,
      });
    });

    it("should handle zero tokens", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            cachedContentTokenCount: 0,
            totalTokenCount: 0,
          },
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });
  });

  describe("missing or incomplete data", () => {
    it("should return zero values for undefined result", () => {
      const usage = extractGeminiUsage(undefined);

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should return zero values when response is missing", () => {
      const result = {} as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should return zero values when usageMetadata is missing", () => {
      const result = {
        response: {},
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should handle partial usage metadata", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: 100,
          } as any,
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 100,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });

    it("should handle undefined values in metadata", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: undefined,
            candidatesTokenCount: undefined,
            cachedContentTokenCount: undefined,
            totalTokenCount: undefined,
          } as any,
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very large token counts", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: 1000000,
            candidatesTokenCount: 500000,
            cachedContentTokenCount: 100000,
            totalTokenCount: 1600000,
          },
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 1000000,
        outputTokens: 500000,
        cachedTokens: 100000,
        totalTokens: 1600000,
      });
    });

    it("should handle only cached tokens", () => {
      const result = {
        response: {
          usageMetadata: {
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            cachedContentTokenCount: 100,
            totalTokenCount: 100,
          },
        },
      } as GenerateContentResult;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 100,
        totalTokens: 100,
      });
    });
  });
});
