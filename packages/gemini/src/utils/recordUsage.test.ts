import { describe, it, expect, vi } from "vitest";
import { recordUsage, finishReasonToStatus } from "./recordUsage.js";
import { FluxGate } from "@fluxgate/sdk";

vi.mock("@fluxgate/sdk", () => ({
  FluxGate: vi.fn(),
}));

function mockInstance(response: any = null) {
  return {
    recordEvent: vi.fn().mockResolvedValue(response),
  } as unknown as FluxGate;
}

describe("finishReasonToStatus", () => {
  it("should return SUCCESS for STOP", () => {
    expect(finishReasonToStatus("STOP")).toBe("SUCCESS");
  });

  it("should return SUCCESS for undefined", () => {
    expect(finishReasonToStatus(undefined)).toBe("SUCCESS");
  });

  it("should return BLOCKED for SAFETY", () => {
    expect(finishReasonToStatus("SAFETY")).toBe("BLOCKED");
  });

  it("should return BLOCKED for BLOCKLIST", () => {
    expect(finishReasonToStatus("BLOCKLIST")).toBe("BLOCKED");
  });

  it("should return BLOCKED for PROHIBITED_CONTENT", () => {
    expect(finishReasonToStatus("PROHIBITED_CONTENT")).toBe("BLOCKED");
  });

  it("should return BLOCKED for SPII", () => {
    expect(finishReasonToStatus("SPII")).toBe("BLOCKED");
  });

  it("should return BLOCKED for IMAGE_SAFETY", () => {
    expect(finishReasonToStatus("IMAGE_SAFETY")).toBe("BLOCKED");
  });

  it("should return MAX_TOKENS for MAX_TOKENS", () => {
    expect(finishReasonToStatus("MAX_TOKENS")).toBe("MAX_TOKENS");
  });

  it("should return RECITATION for RECITATION", () => {
    expect(finishReasonToStatus("RECITATION")).toBe("RECITATION");
  });

  it("should return CONTENT_FILTER for LANGUAGE", () => {
    expect(finishReasonToStatus("LANGUAGE")).toBe("CONTENT_FILTER");
  });

  it("should return MALFORMED_REQUEST for MALFORMED_FUNCTION_CALL", () => {
    expect(finishReasonToStatus("MALFORMED_FUNCTION_CALL")).toBe(
      "MALFORMED_REQUEST",
    );
  });

  it("should return SUCCESS for OTHER and FINISH_REASON_UNSPECIFIED", () => {
    expect(finishReasonToStatus("OTHER")).toBe("SUCCESS");
    expect(finishReasonToStatus("FINISH_REASON_UNSPECIFIED")).toBe("SUCCESS");
  });

  it("should return ERROR for unknown reasons", () => {
    expect(finishReasonToStatus("UNKNOWN_REASON")).toBe("ERROR");
  });
});

describe("recordUsage", () => {
  it("should call instance.recordEvent with correct params", async () => {
    const instance = mockInstance({
      recordId: "r1",
      totalTokens: 150,
      totalCost: 0.005,
      status: "ok",
    });

    const result = await recordUsage({
      instance,
      model: "gemini-2.0-flash",
      latencyMs: 600,
      streaming: false,
      context: {
        feature: "summarize",
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
        provider: "google",
        model: "gemini-2.0-flash",
        user: "u1",
        feature: "summarize",
        performance: expect.objectContaining({
          latency: 600,
          status: "SUCCESS",
          isStreamed: false,
        }),
      }),
    );

    expect(result.cost).toBe(0.005);
    expect(result.trackingId).toBe("r1");
  });

  it("should map thinkingTokens to reasoningTokens in usage", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gemini-2.5-pro",
      latencyMs: 1000,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 100, completionTokens: 50, thinkingTokens: 200 },
      status: "SUCCESS",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        usage: expect.objectContaining({
          promptTokens: 100,
          completionTokens: 50,
          reasoningTokens: 200,
        }),
      }),
    );
  });

  it("should map thinkingCostPer1MTokens to reasoningCostPer1MTokens in costOverride", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gemini-2.5-pro",
      latencyMs: 100,
      streaming: false,
      context: {
        costOverride: {
          inputCostPer1MTokens: 1.25,
          outputCostPer1MTokens: 5,
          thinkingCostPer1MTokens: 10,
        },
      },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        costOverride: expect.objectContaining({
          inputCostPer1MTokens: 1.25,
          outputCostPer1MTokens: 5,
          reasoningCostPer1MTokens: 10,
        }),
      }),
    );
  });

  it("should include metadata when serviceTier is present", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gemini-2.0-flash",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      serviceTier: "standard",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ serviceTier: "standard" }),
      }),
    );
  });

  it("should map ERROR status to ERROR performance", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gemini-2.0-flash",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 0, completionTokens: 0 },
      status: "ERROR",
      errorMessage: "quota exceeded",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({
          status: "ERROR",
          errorMessage: "quota exceeded",
        }),
      }),
    );
  });

  it("should map MALFORMED_REQUEST to ERROR performance", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gemini-2.0-flash",
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

  it("should return degraded response when instance returns null", async () => {
    const instance = mockInstance(null);

    const result = await recordUsage({
      instance,
      model: "gemini-2.0-flash",
      latencyMs: 100,
      streaming: false,
      context: undefined,
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
    });

    expect(result.cost).toBeNull();
    expect(result.trackingId).toBeNull();
    expect(result.status).toBe("SUCCESS");
  });

  it("should include context metadata merged with auto-detected values", async () => {
    const instance = mockInstance(null);

    await recordUsage({
      instance,
      model: "gemini-2.0-flash",
      latencyMs: 100,
      streaming: false,
      context: {
        metadata: { customKey: "customVal" },
      },
      usage: { promptTokens: 10, completionTokens: 5 },
      status: "SUCCESS",
      serviceTier: "batch",
    });

    expect(instance.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          customKey: "customVal",
          serviceTier: "batch",
        }),
      }),
    );
  });
});
