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

  // --- Basic message ---
  console.log("=== Basic Message ===\n");

  const message = await anthropic
    .withContext({ feature: "chat", user: "user-123" })
    .messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [
        { role: "user", content: "What is TypeScript in one sentence?" },
      ],
    });

  const text = message.content.find((b) => b.type === "text");
  console.log("Response:", text?.type === "text" ? text.text : message.content);
  console.log("Tracking:", message.fluxGateCostTrackingResponse);

  // --- System prompt ---
  console.log("\n=== System Prompt ===\n");

  const systemMessage = await anthropic
    .withContext({ feature: "assistant", user: "user-123", step: "answer" })
    .messages.create({
      model: "claude-opus-4-5",
      max_tokens: 512,
      system: "You are a concise technical writer. Reply in one sentence only.",
      messages: [{ role: "user", content: "What is Node.js?" }],
    });

  const systemText = systemMessage.content.find((b) => b.type === "text");
  console.log(
    "Response:",
    systemText?.type === "text" ? systemText.text : systemMessage.content,
  );
  console.log("Tracking:", systemMessage.fluxGateCostTrackingResponse);

  // --- No context (still tracked, no metadata) ---
  console.log("\n=== No Context ===\n");

  const simple = await anthropic.client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [{ role: "user", content: "Hello!" }],
  });

  const simpleText = simple.content.find((b) => b.type === "text");
  console.log(
    "Response:",
    simpleText?.type === "text" ? simpleText.text : simple.content,
  );
  console.log("Tracking:", simple.fluxGateCostTrackingResponse);
}

main().catch(console.error);
