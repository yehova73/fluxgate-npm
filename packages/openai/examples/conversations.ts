import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

async function main() {
  // The raw client is used directly for conversation lifecycle management
  // (create / retrieve / delete). These are CRUD calls — no tokens are consumed
  // and they do not need to go through the tracked wrapper.
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY!,
    debug: true,
  });

  const openai = createOpenAICostTracker(client, fluxgate);

  // --- Create a server-side conversation ---
  // The conversation object stores message history on OpenAI's servers so
  // you do not need to re-send the full history on each turn.
  console.log("=== Create Conversation ===\n");

  const conversation = await client.conversations.create({
    metadata: { userId: "user-123", feature: "support-chat" },
  });
  console.log("Conversation ID:", conversation.id);

  const ctx = {
    feature: "support-chat",
    user: "user-123",
    conversationId: conversation.id,
  };

  // --- First turn ---
  // Pass the conversation ID so the response is stored inside that conversation.
  // store: true persists the response to the conversation history.
  console.log("\n=== Turn 1 ===\n");

  const turn1 = await openai.withContext(ctx).responses.create({
    model: "gpt-4o-mini",
    input: "What are the three main pillars of object-oriented programming?",
    conversation: conversation.id,
    store: true,
  });

  console.log("Assistant:", turn1.output_text);
  console.log("Tracking:", turn1.fluxGateCostTrackingResponse);

  // --- Second turn ---
  // previous_response_id chains this response to the prior one.
  // OpenAI reconstructs the full context server-side — no message array needed.
  console.log("\n=== Turn 2 ===\n");

  const turn2 = await openai.withContext(ctx).responses.create({
    model: "gpt-4o-mini",
    input: "Give a short TypeScript code example for the second pillar.",
    conversation: conversation.id,
    previous_response_id: turn1.id,
    store: true,
  });

  console.log("Assistant:", turn2.output_text);
  console.log("Tracking:", turn2.fluxGateCostTrackingResponse);

  // --- Third turn (streaming) ---
  console.log("\n=== Turn 3 (streaming) ===\n");

  const turn3Stream = await openai.withContext(ctx).responses.create({
    model: "gpt-4o-mini",
    input: "Now summarise all three pillars in one sentence each.",
    conversation: conversation.id,
    previous_response_id: turn2.id,
    store: true,
    stream: true,
  });

  for await (const event of turn3Stream) {
    if (event.type === "response.output_text.delta") {
      process.stdout.write(event.delta);
    }
  }
  console.log("\nTracking:", turn3Stream.fluxGateCostTrackingResponse);

  // --- Retrieve the conversation to inspect stored history ---
  console.log("\n=== Retrieve Conversation ===\n");

  const retrieved = await client.conversations.retrieve(conversation.id);
  console.log("Retrieved conversation ID:", retrieved.id);
  console.log(
    "Created at:",
    new Date(retrieved.created_at * 1000).toISOString(),
  );

  // --- Clean up ---
  await client.conversations.delete(conversation.id);
  console.log("\nConversation deleted.");
}

main().catch(console.error);
