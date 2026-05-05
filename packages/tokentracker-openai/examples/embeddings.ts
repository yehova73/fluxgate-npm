import OpenAI from "openai";
import { Tracker } from "@llmwatch/tokentracker";
import { createOpenAITokenTracker } from "@llmwatch/tokentracker-openai";

async function main() {
  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize LLMWatch tracker
  const tracker = new Tracker({
    apiKey: process.env.LLMWATCH_API_KEY || "your-llmwatch-api-key",
    debug: true,
  });

  // Create tracked client
  const openai = createOpenAITokenTracker(client, tracker);

  console.log("=== Embeddings Example ===\n");

  // Create embeddings
  const embedding = await openai
    .withContext({
      feature: "semantic-search",
      user: "demo-user",
    })
    .embeddings.create({
      model: "text-embedding-ada-002",
      input: "The quick brown fox jumps over the lazy dog",
    });

  console.log("Embedding dimensions:", embedding.data[0].embedding.length);
  console.log("First 10 values:", embedding.data[0].embedding.slice(0, 10));
  console.log("\nTracking Data:", embedding.trackLlmResponse);
  console.log("\nUsage:", embedding.usage);

  console.log("\n=== Multiple Embeddings ===\n");

  // Create multiple embeddings at once
  const multiEmbeddings = await openai
    .withContext({
      feature: "batch-embeddings",
    })
    .embeddings.create({
      model: "text-embedding-ada-002",
      input: [
        "Hello world",
        "Machine learning is fascinating",
        "TypeScript is great for large projects",
      ],
    });

  console.log("Number of embeddings created:", multiEmbeddings.data.length);
  console.log("Tracking Data:", multiEmbeddings.trackLlmResponse);
  console.log("Total tokens used:", multiEmbeddings.usage.total_tokens);
}

main().catch(console.error);
