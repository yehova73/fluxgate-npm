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

  // --- Chat Completions ---
  console.log("=== Chat Completions ===\n");

  const chat = await openai
    .withContext({ feature: "assistant", user: "user-123" })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is TypeScript in one sentence?" },
      ],
    });

  console.log(chat.choices[0].message.content);
  console.log("\nTracking:", chat.fluxGateCostTrackingResponse);

  // --- Responses API ---
  console.log("\n=== Responses API ===\n");

  const response = await openai
    .withContext({ feature: "assistant", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      input: "What is Node.js in one sentence?",
    });

  console.log(response.output_text);
  console.log("\nTracking:", response.fluxGateCostTrackingResponse);

  // --- No context (still tracked, no metadata) ---
  console.log("\n=== No Context ===\n");

  const simple = await openai.client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Hello!" }],
  });

  console.log(simple.choices[0].message.content);
  console.log("\nTracking:", simple.fluxGateCostTrackingResponse);
}

main().catch(console.error);
