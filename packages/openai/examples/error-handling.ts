import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

async function main() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });

  const openai = createOpenAICostTracker(client, fluxgate);

  // --- Error Tracking ---
  // Errors are automatically captured and sent to FluxGate with status ERROR.
  console.log("=== Error Tracking ===\n");

  try {
    await openai
      .withContext({ feature: "chat", user: "user-123" })
      .chat.completions.create({
        model: "invalid-model",
        messages: [{ role: "user", content: "Hello" }],
      });
  } catch (err: any) {
    console.log("Error caught (expected):", err.message);
    console.log(
      "The failed event was tracked automatically with status ERROR.\n",
    );
  }

  // --- Stream Error Tracking ---
  // If a stream throws mid-iteration, the error is tracked before re-throwing.
  console.log("=== Stream Error Tracking ===\n");

  const stream = await openai
    .withContext({ feature: "streaming", user: "user-123" })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Count from 1 to 5." }],
      stream: true,
    });

  try {
    for await (const chunk of stream) {
      process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
    }
    console.log("\n\nTracking:", stream.fluxGateCostTrackingResponse);
  } catch (err: any) {
    console.log("\nStream error:", err.message);
    console.log("Tracking:", stream.fluxGateCostTrackingResponse);
  }

  // --- Legacy Text Completions ---
  console.log("\n=== Legacy Completions ===\n");

  const legacy = await openai
    .withContext({ feature: "legacy-gen", user: "user-123" })
    .completions.create({
      model: "gpt-3.5-turbo-instruct",
      prompt: "Write a one-line tagline for a TypeScript library:",
      max_tokens: 40,
    });

  console.log(legacy.choices[0].text?.trim());
  console.log("\nTracking:", legacy.fluxGateCostTrackingResponse);

  // --- Regional Endpoint ---
  // Point the OpenAI client at a regional base URL. FluxGate automatically
  // detects the region from the hostname and tags every event accordingly.
  console.log("\n=== Regional Endpoint (EU) ===\n");

  const euClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://eu.api.openai.com/v1",
  });
  const euOpenai = createOpenAICostTracker(euClient, fluxgate);

  // All calls through euOpenai are automatically tagged region: 'eu' —
  // no extra context configuration needed.
  const euChat = await euOpenai
    .withContext({ feature: "chat", user: "user-123" })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Hello from Europe!" }],
    });

  console.log(euChat.choices[0].message.content);
  console.log("\nTracking:", euChat.fluxGateCostTrackingResponse);
}

main().catch(console.error);
