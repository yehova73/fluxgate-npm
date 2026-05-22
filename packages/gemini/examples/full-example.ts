import { GoogleGenAI, ServiceTier } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

async function main() {
  // --- Client initialization ---
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "your-gemini-api-key",
  });

  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  const gemini = createGeminiCostTracker(ai, fluxgate);

  // =============================================================
  // === Basic Text Generation ===
  // Demonstrates models.generateContent — single, non-streaming call.
  // =============================================================
  console.log("=== Basic Text Generation ===\n");

  const generated = await gemini
    .withContext({ feature: "basic-generation", user: "demo-user" })
    .models.generateContent({
      model: "gemini-2.5-flash",
      config: { serviceTier: ServiceTier.STANDARD },
      contents: "Explain quantum computing in simple terms.",
    });

  console.log("Response:", generated.text);
  console.log("Usage metadata:", generated.usageMetadata);
  console.log("Tracking:", generated.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(60) + "\n");

  // =============================================================
  // === Streaming Text Generation ===
  // Demonstrates models.generateContentStream — processes chunks as
  // they arrive. fluxGateCostTrackingResponse is populated after
  // the loop completes.
  // =============================================================
  console.log("=== Streaming Text Generation ===\n");

  const stream = await gemini
    .withContext({ feature: "streaming-generation", user: "demo-user" })
    .models.generateContentStream({
      model: "gemini-2.5-flash",
      config: { serviceTier: ServiceTier.PRIORITY },
      contents: "Write a short poem about the ocean.",
    });

  for await (const chunk of stream) {
    process.stdout.write(chunk.text ?? "");
  }

  // Tracking is available only after the stream is fully consumed
  console.log("\nTracking:", stream.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(60) + "\n");

  // =============================================================
  // === Multi-turn Chat — sendMessage ===
  // Demonstrates chats.create + sendMessage. Context is bound when
  // the chat is created and applies to all messages in the session.
  // =============================================================
  console.log("=== Multi-turn Chat (sendMessage) ===\n");

  const chat = gemini
    .withContext({
      feature: "multi-turn-chat",
      user: "demo-user",
      conversationId: "conv-001",
    })
    .chats.create({
      model: "gemini-2.5-flash",
      config: { serviceTier: ServiceTier.FLEX },
      history: [
        {
          role: "user",
          parts: [{ text: "Hi! I want to learn about TypeScript." }],
        },
        {
          role: "model",
          parts: [
            {
              text: "Great choice! TypeScript is a typed superset of JavaScript. What would you like to know?",
            },
          ],
        },
      ],
    });

  const turn1 = await chat
    .withTracking({
      user: "demo-user",
      feature: "multi-turn-chat-turn-1",
    })
    .sendMessage({
      message: "What are generics?",
    });
  console.log("Turn 1 — Response:", turn1.text);
  console.log("Turn 1 — Tracking:", turn1.fluxGateCostTrackingResponse);

  console.log();

  const turn2 = await chat
    .withTracking({
      user: "demo-user",
      feature: "multi-turn-chat-turn-2",
    })
    .sendMessage({
      message: "Can you give me a quick code example?",
    });
  console.log("Turn 2 — Response:", turn2.text);
  console.log("Turn 2 — Tracking:", turn2.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(60) + "\n");

  // =============================================================
  // === Streaming Chat — sendMessageStream ===
  // Same multi-turn session, but streams the response chunk-by-chunk.
  // fluxGateCostTrackingResponse is available after the loop.
  // =============================================================
  console.log("=== Streaming Chat (sendMessageStream) ===\n");

  const chatStream = gemini
    .withContext({
      feature: "streaming-chat",
      user: "demo-user",
      conversationId: "conv-002",
    })
    .chats.create({ model: "gemini-2.5-flash" });

  const messageStream = await chatStream.sendMessageStream({
    message: "Explain async/await in JavaScript in a few sentences.",
  });

  for await (const chunk of messageStream) {
    process.stdout.write(chunk.text ?? "");
  }

  console.log("\nTracking:", messageStream.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(60) + "\n");

  // =============================================================
  // === Embeddings — single text ===
  // Demonstrates models.embedContent for a single input string.
  // Gemini does not return token counts in the embed response.
  // =============================================================
  console.log("=== Embeddings (single) ===\n");

  const singleEmbed = await gemini
    .withContext({ feature: "embedding-single", user: "demo-user" })
    .models.embedContent({
      model: "text-embedding-004",
      contents: "The quick brown fox jumps over the lazy dog",
    });

  const values = singleEmbed.embeddings?.[0]?.values ?? [];
  console.log("Dimensions:", values.length);
  console.log("First 5 values:", values.slice(0, 5));
  console.log("Tracking:", singleEmbed.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(60) + "\n");

  // =============================================================
  // === Embeddings — batch (parallel) ===
  // Demonstrates calling embedContent for multiple texts. Each call
  // is tracked independently; results are combined with Promise.all.
  // =============================================================
  console.log("=== Embeddings (batch) ===\n");

  const texts = [
    "Machine learning is a subset of artificial intelligence.",
    "TypeScript adds static types to JavaScript.",
    "The Eiffel Tower is in Paris, France.",
  ];

  const batchResults = await Promise.all(
    texts.map((text, i) =>
      gemini
        .withContext({
          feature: "embedding-batch",
          user: "demo-user",
          metadata: { index: i },
        })
        .models.embedContent({
          model: "text-embedding-004",
          contents: text,
        }),
    ),
  );

  batchResults.forEach((result, i) => {
    const dims = result.embeddings?.[0]?.values?.length ?? 0;
    console.log(
      `Text ${i} — dimensions: ${dims}, tracking:`,
      result.fluxGateCostTrackingResponse,
    );
  });

  console.log("\n" + "=".repeat(60) + "\n");

  // =============================================================
  // === No-context passthrough (gemini.client) ===
  // Uses the default tracked client without a context object.
  // The call is still tracked server-side; no feature/user metadata
  // will be attached to the event.
  // =============================================================
  console.log("=== No-context Passthrough (gemini.client) ===\n");

  const noCtx = await gemini.client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "What is 2 + 2?",
    config: { serviceTier: ServiceTier.PRIORITY },
  });

  console.log("Response:", noCtx.text);
  console.log("Tracking:", noCtx.fluxGateCostTrackingResponse);
}

main().catch(console.error);
