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

  console.log("=== Basic Message ===\n");

  // Basic message with context
  const message = await anthropic
    .withContext({
      feature: "example-chat",
      user: "demo-user",
    })
    .messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: "What is TypeScript?" }],
    });

  console.log(
    "Response:",
    message.content[0].type === "text"
      ? message.content[0].text
      : message.content,
  );
  console.log("\nTracking Data:", message.fluxGateCostTrackingResponse);
  console.log("\nUsage:", message.usage);
}

main().catch(console.error);
