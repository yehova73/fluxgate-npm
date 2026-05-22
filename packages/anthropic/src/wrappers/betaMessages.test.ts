import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBetaMessagesWrapper } from "./betaMessages.js";
import type { FluxGate } from "@fluxgate/sdk";
import { TrackedStream } from "./TrackedStream.js";

const { recordUsageMock, extractResponseStatusMock } = vi.hoisted(() => ({
  recordUsageMock: vi.fn(),
  extractResponseStatusMock: vi.fn((stopReason: string | null | undefined) => ({
    status: stopReason === "max_tokens" ? "MAX_TOKENS" : "SUCCESS",
  })),
}));

vi.mock("../utils/recordUsage.js", () => ({
  recordUsage: recordUsageMock,
  extractResponseStatus: extractResponseStatusMock,
}));

describe("createBetaMessagesWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordUsageMock.mockResolvedValue({
      status: "SUCCESS",
      cost: 0.001,
      trackingId: "track-123",
      createdAt: 1777939200000,
    });
  });

  it("tracks non-streaming beta messages", async () => {
    const original = vi.fn().mockResolvedValue({
      stop_reason: "end_turn",
      usage: { input_tokens: 10, output_tokens: 4 },
      content: [],
    });

    const wrapped = createBetaMessagesWrapper(
      original as never,
      {} as FluxGate,
      { feature: "beta" },
      "us-east-1",
    );

    const result = await wrapped({ model: "claude-opus-4-5" } as never);

    expect(recordUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-opus-4-5",
        streaming: false,
        status: "SUCCESS",
        region: "us-east-1",
      }),
    );
    expect(
      (result as { fluxGateCostTrackingResponse: unknown })
        .fluxGateCostTrackingResponse,
    ).toBeDefined();
  });

  it("tracks error path with request user then rethrows", async () => {
    const original = vi.fn().mockRejectedValue(new Error("beta failed"));

    const wrapped = createBetaMessagesWrapper(
      original as never,
      {} as FluxGate,
      { feature: "beta" },
      "us-east-1",
    );

    await expect(
      wrapped({
        model: "claude-opus-4-5",
        metadata: { user_id: "req-user" },
      } as never),
    ).rejects.toThrow("beta failed");

    expect(recordUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        streaming: false,
        status: "ERROR",
        requestUser: "req-user",
      }),
    );
  });

  it("tracks streaming beta messages after stream finalizes", async () => {
    const original = vi.fn().mockResolvedValue(
      (async function* () {
        yield {
          type: "message_delta",
          usage: { input_tokens: 7, output_tokens: 3 },
          delta: { stop_reason: "max_tokens" },
        };
      })(),
    );

    const wrapped = createBetaMessagesWrapper(
      original as never,
      {} as FluxGate,
      { feature: "beta-stream" },
      "us-east-1",
    );

    const stream = (await wrapped({
      model: "claude-opus-4-5",
      stream: true,
    } as never)) as TrackedStream<unknown>;

    for await (const _ of stream) {
      // consume
    }

    expect(recordUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        streaming: true,
        status: "MAX_TOKENS",
        region: "us-east-1",
      }),
    );
    expect(stream.fluxGateCostTrackingResponse).toBeDefined();
  });
});
