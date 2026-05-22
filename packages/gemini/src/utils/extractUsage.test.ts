import { describe, it, expect } from "vitest";
import { extractGeminiUsage } from "./extractUsage.js";
import type { GenerateContentResponse } from "@google/genai";

describe("extractGeminiUsage", () => {
  describe("valid usage data", () => {
    it("should extract usage from complete result", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          cachedContentTokenCount: 20,
          totalTokenCount: 170,
        },
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        cacheReadTokens: 20,
      });
    });

    it("should extract reasoning tokens (thoughtsTokenCount)", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          thoughtsTokenCount: 30,
          totalTokenCount: 180,
        },
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        thinkingTokens: 30,
      });
    });

    it("should handle missing cached token count", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 50,
          totalTokenCount: 150,
        },
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
      });
    });

    it("should handle zero tokens", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          cachedContentTokenCount: 0,
          totalTokenCount: 0,
        },
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
    });
  });

  describe("missing or incomplete data", () => {
    it("should return zero values for undefined result", () => {
      const usage = extractGeminiUsage(undefined);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
    });

    it("should return zero values when usageMetadata is missing", () => {
      const result = {} as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
    });

    it("should handle partial usage metadata", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 100,
        } as any,
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 100,
        completionTokens: 0,
      });
    });

    it("should handle undefined values in metadata", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: undefined,
          candidatesTokenCount: undefined,
          cachedContentTokenCount: undefined,
          totalTokenCount: undefined,
        } as any,
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very large token counts", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 1000000,
          candidatesTokenCount: 500000,
          cachedContentTokenCount: 100000,
          totalTokenCount: 1600000,
        },
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 1000000,
        completionTokens: 500000,
        cacheReadTokens: 100000,
      });
    });

    it("should handle only cached tokens", () => {
      const result = {
        usageMetadata: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          cachedContentTokenCount: 100,
          totalTokenCount: 100,
        },
      } as GenerateContentResponse;

      const usage = extractGeminiUsage(result);

      expect(usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        cacheReadTokens: 100,
      });
    });
  });
});
