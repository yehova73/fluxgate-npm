import { describe, it, expect, vi, beforeEach } from "vitest";
import { withAnthropicTracking } from "./createWrappedClient.js";
import type Anthropic from "@anthropic-ai/sdk";
import type { FluxGate } from "@fluxgate/sdk";

const { recordUsageMock } = vi.hoisted(() => ({
  recordUsageMock: vi.fn(),
}));

vi.mock("../utils/recordUsage.js", async () => {
  const actual = await vi.importActual<
    typeof import("../utils/recordUsage.js")
  >("../utils/recordUsage.js");
  return {
    ...actual,
    recordUsage: recordUsageMock,
  };
});

describe("withAnthropicTracking namespaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordUsageMock.mockResolvedValue({
      status: "SUCCESS",
      cost: 0.002,
      trackingId: "track-xyz",
      createdAt: 1777939200000,
    });
  });

  function makeClient() {
    return {
      baseURL: "https://bedrock-runtime.us-east-1.amazonaws.com",
      messages: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "end_turn",
          usage: { input_tokens: 12, output_tokens: 6 },
          content: [{ type: "text", text: "ok" }],
        }),
      },
      completions: {
        create: vi.fn().mockResolvedValue({
          stop_reason: "stop_sequence",
          completion: "legacy",
        }),
      },
      beta: {
        messages: {
          create: vi.fn().mockResolvedValue({
            stop_reason: "end_turn",
            usage: { input_tokens: 4, output_tokens: 2 },
            content: [{ type: "text", text: "beta" }],
          }),
        },
      },
    } as unknown as Anthropic;
  }

  it("messages.withTracking merges context and does not mutate base namespace", async () => {
    const client = makeClient();
    const tracked = withAnthropicTracking(client, {} as FluxGate, {
      feature: "chat",
      metadata: { original: true },
    });

    const forked = tracked.messages.withTracking({
      step: "follow-up",
      metadata: { forked: true },
    });

    expect(forked).not.toBe(tracked.messages);

    await forked.create({ model: "claude-opus-4-5" } as never);
    await tracked.messages.create({ model: "claude-opus-4-5" } as never);

    const firstCall = recordUsageMock.mock.calls[0][0];
    const secondCall = recordUsageMock.mock.calls[1][0];

    expect(firstCall.context).toEqual({
      feature: "chat",
      step: "follow-up",
      metadata: { forked: true },
    });
    expect(firstCall.region).toBe("us-east-1");

    expect(secondCall.context).toEqual({
      feature: "chat",
      metadata: { original: true },
    });
  });

  it("beta.messages.withTracking merges context and returns tracked namespace", async () => {
    const client = makeClient();
    const tracked = withAnthropicTracking(client, {} as FluxGate, {
      feature: "beta-chat",
    });

    const forkedBeta = tracked.beta.messages.withTracking({
      step: "reasoning",
    });

    expect(typeof forkedBeta.create).toBe("function");

    await forkedBeta.create({ model: "claude-opus-4-5" } as never);

    const call = recordUsageMock.mock.calls[0][0];
    expect(call.context).toEqual({ feature: "beta-chat", step: "reasoning" });
    expect(call.region).toBe("us-east-1");
  });
});
