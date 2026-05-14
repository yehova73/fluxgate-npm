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

  console.log("=== Error Handling Example ===\n");

  // Example 1: Invalid model name
  console.log("1. Testing with an invalid model...");
  try {
    await anthropic
      .withContext({
        feature: "error-handling",
        user: "demo-user",
      })
      .messages.create({
        model: "invalid-model-name" as any,
        max_tokens: 1024,
        messages: [{ role: "user", content: "Hello" }],
      });
  } catch (error: any) {
    console.log("Caught error (expected):", error.message);
    console.log("Error was tracked automatically\n");
  }

  // Example 2: Exceeding max_tokens in a streaming response
  console.log("2. Testing streaming with error handling...");
  try {
    const stream = await anthropic
      .withContext({
        feature: "streaming-error-test",
        user: "demo-user",
      })
      .messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 64,
        messages: [
          {
            role: "user",
            content: "Count from 1 to 100, one number per line.",
          },
        ],
        stream: true,
      });

    let chunkCount = 0;
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        process.stdout.write(event.delta.text);
        chunkCount++;
      }
    }

    console.log(`\n\nSuccessfully processed ${chunkCount} delta events`);
    console.log("Tracking Data:", stream.fluxGateCostTrackingResponse);
  } catch (error: any) {
    console.log("Caught streaming error:", error.message);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
