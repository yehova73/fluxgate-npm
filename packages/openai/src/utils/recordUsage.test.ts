import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  recordUsage,
  finishReasonToStatus,
  extractResponseStatus,
  detectRegion,
  detectProvider,
} from "./recordUsage.js";
import { FluxGate } from "@fluxgate/sdk";

// Mock FluxGate so we never hit the network
vi.mock("@fluxgate/sdk", () => ({
  FluxGate: vi.fn(),
}));

function mockInstance(response: any = null) {
  return {
    recordEvent: vi.fn().mockResolvedValue(response),
  } as unknown as FluxGate;
}

describe("detectRegion", () => {
  it("should detect known regions", () => {
    expect(detectRegion("https://eu.api.openai.com/v1")).toBe("eu");
    expect(detectRegion("https://au.api.openai.com/v1")).toBe("au");
    expect(detectRegion("https://jp.api.openai.com/v1")).toBe("jp");
  });

  it("should return undefined for standard endpoint", () => {
    expect(detectRegion("https://api.openai.com/v1")).toBeUndefined();
  });

  it("should return undefined for invalid URL", () => {
    expect(detectRegion("not-a-url")).toBeUndefined();
  });
});

describe("detectProvider", () => {
  it("should detect openai", () => {
    expect(detectProvider("https://api.openai.com/v1")).toBe("openai");
    expect(detectProvider("https://eu.api.openai.com/v1")).toBe("openai");
  });

  it("should detect azure", () => {
    expect(detectProvider("https://my-resource.openai.azure.com/v1")).toBe(
      "azure",
    );
  });

  it("should detect groq", () => {
    expect(detectProvider("https://api.groq.com/v1")).toBe("groq");
  });

  it("should detect together", () => {
    expect(detectProvider("https://api.together.xyz/v1")).toBe("together");
  });

  it("should detect xai", () => {
    expect(detectProvider("https://api.x.ai/v1")).toBe("xai");
  });

  it("should detect openrouter", () => {
    expect(detectProvider("https://openrouter.ai/v1")).toBe("openrouter");
    expect(detectProvider("https://api.openrouter.ai/v1")).toBe("openrouter");
  });

  it("should detect mistral", () => {
    expect(detectProvider("https://api.mistral.ai/v1")).toBe("mistral");
  });

  it("should detect google", () => {
    expect(detectProvider("https://generativelanguage.googleapis.com/v1")).toBe(
      "google",
    );
  });

  it("should return hostname for unknown providers", () => {
    expect(detectProvider("https://my-custom-proxy.com/v1")).toBe(
      "my-custom-proxy.com",
    );
  });

  it("should return openai for invalid URL", () => {
    expect(detectProvider("not-a-url")).toBe("openai");
  });
});

describe("finishReasonToStatus", () => {
  it("should return SUCCESS for stop", () => {
    expect(finishReasonToStatus("stop")).toBe("SUCCESS");
  });

  it("should return SUCCESS for null/undefined", () => {
    expect(finishReasonToStatus(null)).toBe("SUCCESS");
    expect(finishReasonToStatus(undefined)).toBe("SUCCESS");
  });

  it("should return BLOCKED for content_filter", () => {
    expect(finishReasonToStatus("content_filter")).toBe("BLOCKED");
  });

  it("should return MAX_TOKENS for length", () => {
    expect(finishReasonToStatus("length")).toBe("MAX_TOKENS");
  });

  it("should return SUCCESS for tool_calls and function_call", () => {
    expect(finishReasonToStatus("tool_calls")).toBe("SUCCESS");
    expect(finishReasonToStatus("function_call")).toBe("SUCCESS");
  });

  it("should return ERROR for unknown reasons", () => {
    expect(finishReasonToStatus("some_unknown")).toBe("ERROR");
  });
});

describe("extractResponseStatus", () => {
  it("should return SUCCESS for undefined response", () => {
    expect(extractResponseStatus(undefined)).toEqual({ status: "SUCCESS" });
  });

  it("should return ERROR for failed response", () => {
    const response = {
      status: "failed",
      error: { message: "something went wrong" },
    } as any;
    expect(extractResponseStatus(response)).toEqual({
      status: "ERROR",
      errorMessage: "something went wrong",
    });
  });

  it("should return BLOCKED for content_filter incomplete", () => {
    const response = {
      status: "incomplete",
      incomplete_details: { reason: "content_filter" },
    } as any;
    expect(extractResponseStatus(response)).toEqual({ status: "BLOCKED" });
  });

  it("should return MAX_TOKENS for max_output_tokens incomplete", () => {
    const response = {
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
    } as any;
    expect(extractResponseStatus(response)).toEqual({ status: "MAX_TOKENS" });
  });

  it("should return SUCCESS for completed response", () => {
    const response = { status: "completed" } as any;
    expect(extractResponseStatus(response)).toEqual({ status: "SUCCESS" });
  });
});

describe("recordUsage", () => {
  it("should call instance.recordEvent with correct params", async () => {
    const instance = mockInstance({
      recordId: "r1",
      totalTokens: 150,
      totalCost: 0.01,
      status: "ok",
    });

    const result = await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 500,
      streaming: false,
      context: {
        feature: "chat",
        user: "u1",
        step: "gen",
        sessionId: "s1",
        conversationId: "c1",
      },
      usage: { promptTokens: 100, completionTokens: 50 },
      status: "SUCCESS",
      provider: "openai",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "openai",
        model: "gpt-4o",
        user: "u1",
        feature: "chat",
        step: "gen",
        sessionId: "s1",
        conversationId: "c1",
        performance: {
          latency: 500,
          status: "SUCCESS",
          isStreamed: false,
          errorMessage: null,
        },
        usage: { promptTokens: 100, completionTokens: 50 },
      }),
    );

    expect(result.cost).toBe(0.01);
    expect(result.trackingId).toBe("r1");
    expect(result.status).toBe("SUCCESS");
  });

  it("should fall back to requestUser when context.user is not set", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      provider: "openai",
      requestUser: "fallback-user",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user: "fallback-user" }),
    );
  });

  it("should include metadata when serviceTier or region is present", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      provider: "openai",
      serviceTier: "standard",
      region: "eu",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          serviceTier: "standard",
          region: "eu",
        }),
      }),
    );
  });

  it("should include costOverride from context", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 100,
      streaming: false,
      context: {
        costOverride: {
          inputCostPer1MTokens: 2.5,
          outputCostPer1MTokens: 10,
        },
      },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      provider: "openai",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        costOverride: {
          inputCostPer1MTokens: 2.5,
          outputCostPer1MTokens: 10,
        },
      }),
    );
  });

  it("should map ERROR status to ERROR performance", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 0, completionTokens: 0 },
      status: "ERROR",
      errorMessage: "rate limit",
      provider: "openai",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({
          status: "ERROR",
          errorMessage: "rate limit",
        }),
      }),
    );
  });

  it("should return degraded response when recordEvent throws", async () => {
    const instance = {
      recordEvent: vi.fn().mockRejectedValue(new Error("boom")),
    } as unknown as FluxGate;

    const result = await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      provider: "openai",
    });

    expect(result.cost).toBeNull();
    expect(result.trackingId).toBeNull();
    expect(result.status).toBe("SUCCESS");
  });

  it("should include context metadata merged with auto-detected values", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gpt-4o",
      latencyMs: 100,
      streaming: false,
      context: {
        metadata: { customField: "value" },
      },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      provider: "openai",
      serviceTier: "batch",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          customField: "value",
          serviceTier: "batch",
        }),
      }),
    );
  });
});
