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

  // --- Streaming messages.create ---
  console.log("=== Streaming messages.create ===\n");

  const stream = await anthropic
    .withContext({
      feature: "streaming",
      user: "user-123",
      sessionId: "session-1",
    })
    .messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        { role: "user", content: "Write a short poem about programming." },
      ],
      stream: true,
    });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  console.log("\n\nTracking:", stream.fluxGateCostTrackingResponse);

  // --- Streaming with tool use ---
  console.log("\n=== Streaming with Tool Use ===\n");

  const toolStream = await anthropic
    .withContext({ feature: "streaming-tools", user: "user-123" })
    .messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      tools: [
        {
          name: "get_time",
          description: "Get the current time",
          input_schema: { type: "object" as const, properties: {} },
        },
      ],
      messages: [{ role: "user", content: "What time is it right now?" }],
      stream: true,
    });

  for await (const event of toolStream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  console.log("\n\nTracking:", toolStream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
