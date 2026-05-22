/**
 * Extended Thinking example for @fluxgate/anthropic
 *
 * Extended thinking gives Claude space to reason step-by-step before answering.
 * It is accessed via `client.beta.messages.create` with the
 * `interleaved-thinking-2025-05-14` beta flag and `thinking: { type: "enabled" }`.
 *
 * Thinking tokens are billed as output tokens (no separate pricing tier),
 * so `AnthropicCostOverride` does not need a `reasoningCostPer1MTokens` field.
 *
 * FluxGate tracks the full usage (including thinking tokens counted as output)
 * through the `beta.messages.create` wrapper.
 *
 * Docs: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking
 */
import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  const tracked = anthropic.withContext({
    feature: "extended-thinking",
    user: "user-123",
  });

  // --- Non-streaming extended thinking ---
  console.log("=== Extended Thinking (non-streaming) ===\n");

  const response = await tracked.beta.messages.create(
    {
      model: "claude-opus-4-5",
      max_tokens: 16000,
      thinking: { type: "enabled", budget_tokens: 10000 },
      messages: [
        {
          role: "user",
          content:
            "Solve step by step: A train travels at 60 mph for 2 hours, then at 80 mph for 3 hours. What is the average speed for the entire journey?",
        },
      ],
    },
    { headers: { "anthropic-beta": "interleaved-thinking-2025-05-14" } },
  );

  for (const block of response.content) {
    if (block.type === "thinking") {
      console.log("Thinking:\n", block.thinking, "\n");
    } else if (block.type === "text") {
      console.log("Answer:", block.text);
    }
  }
  console.log("Usage:", response.usage);
  console.log("Tracking:", response.fluxGateCostTrackingResponse);

  // --- Streaming extended thinking ---
  console.log("\n=== Extended Thinking (streaming) ===\n");

  const stream = await tracked.beta.messages.create(
    {
      model: "claude-opus-4-5",
      max_tokens: 8000,
      thinking: { type: "enabled", budget_tokens: 5000 },
      messages: [
        {
          role: "user",
          content:
            "Is 17 * 19 = 323? Show your reasoning before answering yes or no.",
        },
      ],
      stream: true,
    },
    { headers: { "anthropic-beta": "interleaved-thinking-2025-05-14" } },
  );

  let inThinking = false;
  for await (const event of stream) {
    if (event.type === "content_block_start") {
      if (event.content_block.type === "thinking") {
        inThinking = true;
        process.stdout.write("[thinking] ");
      } else if (event.content_block.type === "text") {
        inThinking = false;
        process.stdout.write("\n[answer] ");
      }
    }
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "thinking_delta" &&
      inThinking
    ) {
      process.stdout.write(event.delta.thinking);
    }
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta" &&
      !inThinking
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  console.log("\n\nTracking:", stream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
