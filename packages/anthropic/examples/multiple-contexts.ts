import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import {
  createAnthropicCostTracker,
  AnthropicCostOverride,
} from "@fluxgate/anthropic";

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });
  const anthropic = createAnthropicCostTracker(client, fluxgate);

  // --- Feature isolation ---
  console.log("=== Feature Isolation ===\n");

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
    model: "claude-haiku-4-5",
    max_tokens: 512,
    messages: [{ role: "user", content: "How do I reset my password?" }],
  });
  const supportText = supportResponse.content.find((b) => b.type === "text");
  console.log("Support:", supportText?.type === "text" ? supportText.text : "");
  console.log("Tracking:", supportResponse.fluxGateCostTrackingResponse);

  // --- Code review with step tracking ---
  console.log("\n=== Code Review Pipeline ===\n");

  const codeClient = anthropic.withContext({
    feature: "code-review",
    user: "user-456",
    step: "review",
    metadata: { language: "typescript" },
  });

  const codeResponse = await codeClient.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: "You are an expert TypeScript code reviewer.",
    messages: [
      {
        role: "user",
        content: "Review this: function add(a: any, b: any) { return a + b; }",
      },
    ],
  });
  const codeText = codeResponse.content.find((b) => b.type === "text");
  console.log("Review:", codeText?.type === "text" ? codeText.text : "");
  console.log("Tracking:", codeResponse.fluxGateCostTrackingResponse);

  // --- Custom pricing with AnthropicCostOverride ---
  console.log("\n=== Custom Cost Override ===\n");

  const customPricing: AnthropicCostOverride = {
    inputCostPer1MTokens: 2.0,
    outputCostPer1MTokens: 8.0,
    cacheReadCostPer1MTokens: 0.2,
    cacheWriteCostPer1MTokens: 2.5,
  };

  const customResponse = await anthropic
    .withContext({
      feature: "fine-tuned",
      user: "user-789",
      costOverride: customPricing,
    })
    .messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: "Hello!" }],
    });
  const customText = customResponse.content.find((b) => b.type === "text");
  console.log("Response:", customText?.type === "text" ? customText.text : "");
  console.log("Tracking:", customResponse.fluxGateCostTrackingResponse);

  // --- No-context default client ---
  console.log("\n=== No Context (default client) ===\n");

  const defaultResponse = await anthropic.client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: "Write a one-sentence product tagline for a task manager app.",
      },
    ],
  });
  const defaultText = defaultResponse.content.find((b) => b.type === "text");
  console.log(
    "Response:",
    defaultText?.type === "text" ? defaultText.text : "",
  );
  console.log("Tracking:", defaultResponse.fluxGateCostTrackingResponse);
}

main().catch(console.error);
