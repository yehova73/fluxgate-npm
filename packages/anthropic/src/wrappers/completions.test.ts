import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCompletionsWrapper } from "./completions.js";
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

describe("createCompletionsWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordUsageMock.mockResolvedValue({
      status: "SUCCESS",
      cost: 0.001,
      trackingId: "track-123",
      createdAt: 1777939200000,
    });
  });

  it("tracks non-streaming completions", async () => {
    const original = vi.fn().mockResolvedValue({
      stop_reason: "stop_sequence",
      completion: "Hello",
    });

    const wrapped = createCompletionsWrapper(
      original as never,
      {} as FluxGate,
      { feature: "chat" },
      "us-east-1",
    );

    const result = await wrapped({ model: "claude-2" } as never);

    expect(original).toHaveBeenCalledTimes(1);
    expect(recordUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-2",
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

  it("tracks error path then rethrows", async () => {
    const original = vi.fn().mockRejectedValue(new Error("completion failed"));

    const wrapped = createCompletionsWrapper(
      original as never,
      {} as FluxGate,
      { feature: "chat" },
      "us-east-1",
    );

    await expect(wrapped({ model: "claude-2" } as never)).rejects.toThrow(
      "completion failed",
    );

    expect(recordUsageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        streaming: false,
        status: "ERROR",
        errorMessage: "completion failed",
      }),
    );
  });

  it("tracks streaming completions after stream finalizes", async () => {
    const original = vi.fn().mockResolvedValue(
      (async function* () {
        yield { completion: "Hi" };
        yield { completion: " there", stop_reason: "max_tokens" };
      })(),
    );

    const wrapped = createCompletionsWrapper(
      original as never,
      {} as FluxGate,
      { feature: "stream" },
      "us-east-1",
    );

    const stream = (await wrapped({
      model: "claude-2",
      stream: true,
    } as never)) as TrackedStream<unknown>;

    const chunks: unknown[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
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
