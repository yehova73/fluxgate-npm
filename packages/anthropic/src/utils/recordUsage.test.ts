import { describe, it, expect, vi } from "vitest";
import {
  recordUsage,
  stopReasonToStatus,
  extractResponseStatus,
} from "./recordUsage.js";
import { FluxGate } from "@fluxgate/sdk";

vi.mock("@fluxgate/sdk", () => ({
  FluxGate: vi.fn(),
}));

function mockInstance(response: any = null) {
  return {
    recordEvent: vi.fn().mockResolvedValue(response),
  } as unknown as FluxGate;
}

describe("stopReasonToStatus", () => {
  it("should return SUCCESS for end_turn", () => {
    expect(stopReasonToStatus("end_turn")).toBe("SUCCESS");
  });

  it("should return SUCCESS for stop_sequence", () => {
    expect(stopReasonToStatus("stop_sequence")).toBe("SUCCESS");
  });

  it("should return SUCCESS for null/undefined", () => {
    expect(stopReasonToStatus(null)).toBe("SUCCESS");
    expect(stopReasonToStatus(undefined)).toBe("SUCCESS");
  });

  it("should return MAX_TOKENS for max_tokens", () => {
    expect(stopReasonToStatus("max_tokens")).toBe("MAX_TOKENS");
  });

  it("should return BLOCKED for content_filter", () => {
    expect(stopReasonToStatus("content_filter")).toBe("BLOCKED");
  });

  it("should return SUCCESS for tool_use", () => {
    expect(stopReasonToStatus("tool_use")).toBe("SUCCESS");
  });

  it("should return ERROR for unknown reasons", () => {
    expect(stopReasonToStatus("something_else")).toBe("ERROR");
  });
});

describe("extractResponseStatus", () => {
  it("should delegate to stopReasonToStatus", () => {
    expect(extractResponseStatus("end_turn")).toEqual({ status: "SUCCESS" });
    expect(extractResponseStatus("max_tokens")).toEqual({
      status: "MAX_TOKENS",
    });
    expect(extractResponseStatus(null)).toEqual({ status: "SUCCESS" });
  });
});

describe("recordUsage", () => {
  it("should call instance.recordEvent with correct params", async () => {
    const instance = mockInstance({
      recordId: "r1",
      totalTokens: 150,
      totalCost: 0.02,
      status: "ok",
    });

    const result = await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 800,
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
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        user: "u1",
        feature: "chat",
        performance: expect.objectContaining({
          latency: 800,
          status: "SUCCESS",
          isStreamed: false,
        }),
      }),
    );

    expect(result.cost).toBe(0.02);
    expect(result.trackingId).toBe("r1");
  });

  it("should fall back to requestUser when context.user is not set", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      requestUser: "fallback-user",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ user: "fallback-user" }),
    );
  });

  it("should include metadata when serviceTier or region present in context", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 100,
      streaming: false,
      context: {
        serviceTier: "standard",
        region: "us-east-1",
        openrouterCost: 0.005,
        cacheTtl: "5m",
      },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          serviceTier: "standard",
          region: "us-east-1",
          openrouterCost: 0.005,
          cacheTtl: "5m",
        }),
      }),
    );
  });

  it("should include costOverride from context", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 100,
      streaming: false,
      context: {
        costOverride: {
          inputCostPer1MTokens: 3,
          outputCostPer1MTokens: 15,
        },
      },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        costOverride: {
          inputCostPer1MTokens: 3,
          outputCostPer1MTokens: 15,
        },
      }),
    );
  });

  it("should map ERROR status to ERROR performance", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 0, completionTokens: 0 },
      status: "ERROR",
      errorMessage: "overloaded",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({
          status: "ERROR",
          errorMessage: "overloaded",
        }),
      }),
    );
  });

  it("should map MALFORMED_REQUEST to ERROR performance", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 0, completionTokens: 0 },
      status: "MALFORMED_REQUEST",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({ status: "ERROR" }),
      }),
    );
  });

  it("should include timestamp from context", async () => {
    const instance = mockInstance(null);
    const ts = Date.now();

    await recordUsage({
      instance,
      model: "claude-sonnet-4-20250514",
      latencyMs: 100,
      streaming: false,
      context: { timestamp: ts },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ timestamp: ts }),
    );
  });
});
