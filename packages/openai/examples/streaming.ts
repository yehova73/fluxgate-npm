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

  // --- Streaming Chat Completions ---
  console.log("=== Streaming Chat Completions ===\n");

  const chatStream = await openai
    .withContext({
      feature: "content-gen",
      user: "user-123",
      sessionId: "sess-abc",
    })
    .chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Write a haiku about TypeScript." }],
      stream: true,
    });

  for await (const chunk of chatStream) {
    process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
  }

  console.log("\n\nTracking:", chatStream.fluxGateCostTrackingResponse);

  // --- Streaming Responses API ---
  console.log("\n=== Streaming Responses API ===\n");

  const responseStream = await openai
    .withContext({ feature: "content-gen", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      input: "Write a haiku about distributed systems.",
      stream: true,
    });

  for await (const event of responseStream) {
    if (event.type === "response.output_text.delta") {
      process.stdout.write(event.delta);
    }
  }

  console.log("\n\nTracking:", responseStream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
