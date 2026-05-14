import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

async function main() {
  // Initialize Anthropic client
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Initialize FluxGate instance
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  // Create tracked client
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  console.log("=== Streaming Message ===\n");

  // Streaming message with context
  const stream = await anthropic
    .withContext({
      feature: "streaming-example",
      user: "demo-user",
      sessionId: "session-123",
    })
    .messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        { role: "user", content: "Write a short poem about programming." },
      ],
      stream: true,
    });

  console.log("Streaming response:\n");

  // Process the stream chunk by chunk
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  console.log("\n\n=== Stream Complete ===\n");

  // Access tracking data after stream completes
  console.log("Tracking Data:", stream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
