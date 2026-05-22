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

  // --- Invalid model (caught, tracked as ERROR) ---
  console.log("=== Invalid Model ===\n");
  try {
    await anthropic
      .withContext({ feature: "error-test", user: "user-123" })
      .messages.create({
        model: "invalid-model-name" as Anthropic.Model,
        max_tokens: 1024,
        messages: [{ role: "user", content: "Hello" }],
      });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log("Caught error (expected):", msg);
    console.log("Error was tracked automatically.\n");
  }

  // --- MAX_TOKENS stop reason ---
  console.log("=== MAX_TOKENS stop reason ===\n");

  const maxTokensResponse = await anthropic
    .withContext({ feature: "max-tokens-test", user: "user-123" })
    .messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 10,
      messages: [{ role: "user", content: "Count from 1 to 100." }],
    });

  console.log("Stop reason:", maxTokensResponse.stop_reason);
  console.log(
    "Tracking status:",
    maxTokensResponse.fluxGateCostTrackingResponse?.status,
  );
  // status will be MAX_TOKENS

  // --- Streaming error tracking ---
  console.log("\n=== Streaming with short max_tokens ===\n");

  const stream = await anthropic
    .withContext({ feature: "streaming-error-test", user: "user-123" })
    .messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 64,
      messages: [
        { role: "user", content: "Count from 1 to 1000, one number per line." },
      ],
      stream: true,
    });

  let chunks = 0;
  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
      chunks++;
    }
  }

  console.log(`\n\nProcessed ${chunks} delta events.`);
  console.log("Tracking:", stream.fluxGateCostTrackingResponse);
  // status will be MAX_TOKENS
}

main().catch(console.error);
