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

  // --- Single Embedding ---
  console.log("=== Single Embedding ===\n");

  const single = await openai
    .withContext({ feature: "semantic-search", user: "user-123" })
    .embeddings.create({
      model: "text-embedding-3-small",
      input: "The quick brown fox jumps over the lazy dog",
    });

  console.log("Dimensions:", single.data[0].embedding.length);
  console.log("Tracking:", single.fluxGateCostTrackingResponse);

  // --- Batch Embeddings ---
  console.log("\n=== Batch Embeddings ===\n");

  const batch = await openai
    .withContext({
      feature: "semantic-search",
      user: "user-123",
      metadata: { searchType: "documents" },
    })
    .embeddings.create({
      model: "text-embedding-3-small",
      input: [
        "TypeScript is a typed superset of JavaScript",
        "Node.js is a JavaScript runtime built on Chrome's V8 engine",
        "React is a library for building user interfaces",
      ],
    });

  console.log("Embeddings created:", batch.data.length);
  console.log("Total tokens:", batch.usage.total_tokens);
  console.log("Tracking:", batch.fluxGateCostTrackingResponse);
}

main().catch(console.error);
