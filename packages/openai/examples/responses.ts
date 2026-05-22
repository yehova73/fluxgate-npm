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

  // --- Basic Response ---
  console.log("=== Basic Response ===\n");

  const response = await openai
    .withContext({ feature: "assistant", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      input: "What is TypeScript in one sentence?",
    });

  console.log(response.output_text);
  console.log("\nTracking:", response.fluxGateCostTrackingResponse);

  // --- Streaming Response ---
  console.log("\n=== Streaming Response ===\n");

  const stream = await openai
    .withContext({ feature: "content-gen", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      input: "Write a haiku about distributed systems.",
      stream: true,
    });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      process.stdout.write(event.delta);
    }
  }
  console.log("\n\nTracking:", stream.fluxGateCostTrackingResponse);

  // --- Multi-turn with previous_response_id ---
  console.log("\n=== Multi-turn Responses ===\n");

  const turn1 = await openai
    .withContext({
      feature: "tutor",
      user: "user-123",
      conversationId: "conv-abc",
    })
    .responses.create({
      model: "gpt-4o-mini",
      input: "What are the three pillars of OOP?",
    });

  console.log("Turn 1:", turn1.output_text);
  console.log("Tracking:", turn1.fluxGateCostTrackingResponse);

  const turn2 = await openai
    .withContext({
      feature: "tutor",
      user: "user-123",
      conversationId: "conv-abc",
    })
    .responses.create({
      model: "gpt-4o-mini",
      input: "Give a short TypeScript example of the second one.",
      previous_response_id: turn1.id,
    });

  console.log("\nTurn 2:", turn2.output_text);
  console.log("Tracking:", turn2.fluxGateCostTrackingResponse);

  // --- Web Search Tool ---
  console.log("\n=== Web Search Tool ===\n");

  const searchRes = await openai
    .withContext({ feature: "research", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      input: "What is the latest version of TypeScript?",
      tools: [{ type: "web_search_preview" }],
    });

  console.log(searchRes.output_text);
  console.log("\nTracking:", searchRes.fluxGateCostTrackingResponse);

  // --- Structured Output (JSON schema) ---
  console.log("\n=== Structured Output ===\n");

  const structured = await openai
    .withContext({ feature: "extraction", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      input: "Extract: name=Alice, age=30, role=engineer",
      text: {
        format: {
          type: "json_schema",
          name: "person",
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
              role: { type: "string" },
            },
            required: ["name", "age", "role"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

  console.log("Parsed:", structured.output_text);
  console.log("Tracking:", structured.fluxGateCostTrackingResponse);

  // --- System Instructions ---
  console.log("\n=== System Instructions ===\n");

  const systemRes = await openai
    .withContext({ feature: "assistant", user: "user-123" })
    .responses.create({
      model: "gpt-4o-mini",
      instructions:
        "You are a concise technical assistant. Answer in one sentence.",
      input: "What is a closure?",
    });

  console.log(systemRes.output_text);
  console.log("\nTracking:", systemRes.fluxGateCostTrackingResponse);
}

main().catch(console.error);
