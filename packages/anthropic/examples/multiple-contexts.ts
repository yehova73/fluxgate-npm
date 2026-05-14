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

  console.log("=== Multiple Contexts Example ===\n");
  console.log("Simulating different features in the same app\n");

  // Context 1: Customer support chatbot
  console.log("1. CUSTOMER SUPPORT FEATURE");
  const supportClient = anthropic.withContext({
    feature: "customer-support",
    user: {
      id: "user-123",
      name: "Alice",
      email: "alice@example.com",
      monthlyRevenue: 49.99,
    },
    sessionId: "session-abc",
  });

  const supportResponse = await supportClient.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 512,
    messages: [{ role: "user", content: "How do I reset my password?" }],
  });

  console.log(
    "Response:",
    supportResponse.content[0].type === "text"
      ? supportResponse.content[0].text
      : supportResponse.content,
  );
  console.log("Tracking:", supportResponse.fluxGateCostTrackingResponse);
  console.log();

  // Context 2: Code review feature
  console.log("2. CODE REVIEW FEATURE");
  const codeClient = anthropic.withContext({
    feature: "code-review",
    user: "user-456",
    step: "review",
    language: "typescript",
  });

  const codeResponse = await codeClient.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: "You are an expert TypeScript code reviewer.",
    messages: [
      {
        role: "user",
        content:
          "Review this function:\n\nfunction add(a: any, b: any) { return a + b; }",
      },
    ],
  });

  console.log(
    "Response:",
    codeResponse.content[0].type === "text"
      ? codeResponse.content[0].text
      : codeResponse.content,
  );
  console.log("Tracking:", codeResponse.fluxGateCostTrackingResponse);
  console.log();

  // Context 3: Content generation using the default client (no explicit context)
  console.log("3. CONTENT GENERATION FEATURE (default client)");
  const contentResponse = await anthropic.client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: "Write a one-sentence product tagline for a task manager app.",
      },
    ],
  });

  console.log(
    "Response:",
    contentResponse.content[0].type === "text"
      ? contentResponse.content[0].text
      : contentResponse.content,
  );
  console.log("Tracking:", contentResponse.fluxGateCostTrackingResponse);
}

main().catch(console.error);
