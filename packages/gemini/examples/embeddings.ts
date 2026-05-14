import { GoogleGenAI } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

async function main() {
  // Initialize Gemini with embedding model
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "your-gemini-api-key",
  });

  // Initialize FluxGate instance
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  // Create tracked client
  const gemini = createGeminiCostTracker(ai, fluxgate);

  console.log("=== Embeddings Example ===\n");

  // Create single embedding
  const result = await gemini
    .withContext({
      feature: "semantic-search",
      user: "demo-user",
    })
    .embedContent({
      model: "text-embedding-004",
      contents: "The quick brown fox jumps over the lazy dog",
    });

  const values = result.embeddings?.[0]?.values ?? [];
  console.log("Embedding dimensions:", values.length);
  console.log("First 10 values:", values.slice(0, 10));
  console.log("\nTracking Data:", result.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(50) + "\n");

  // Create embeddings for multiple texts (for semantic similarity)
  console.log("=== Semantic Similarity Example ===\n");

  const texts = [
    "Machine learning is a subset of artificial intelligence",
    "AI and ML are transforming technology",
    "I love eating pizza for dinner",
  ];

  const embeddings = await Promise.all(
    texts.map(async (text, index) => {
      const result = await gemini
        .withContext({
          feature: "batch-embeddings",
          step: `text-${index}`,
        })
        .embedContent({ model: "text-embedding-004", contents: text });
      return {
        text,
        embedding: result.embeddings?.[0]?.values ?? [],
        fluxGateCostTrackingResponse: result.fluxGateCostTrackingResponse,
      };
    }),
  );

  // Calculate cosine similarity between first and second text
  const similarity12 = cosineSimilarity(
    embeddings[0].embedding,
    embeddings[1].embedding,
  );

  // Calculate cosine similarity between first and third text
  const similarity13 = cosineSimilarity(
    embeddings[0].embedding,
    embeddings[2].embedding,
  );

  console.log(`Similarity between text 1 and 2: ${similarity12.toFixed(4)}`);
  console.log(`Similarity between text 1 and 3: ${similarity13.toFixed(4)}`);
  console.log(
    "\nText 1 and 2 are more similar (both about AI/ML) than text 1 and 3 (unrelated)",
  );
}

// Helper function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

main().catch(console.error);
