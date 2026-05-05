import { GoogleGenerativeAI } from "@google/generative-ai";
import { Tracker } from "@llmwatch/tokentracker";
import { createGeminiTokenTracker } from "@llmwatch/tokentracker-gemini";

async function main() {
  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || "your-gemini-api-key",
  );
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Initialize LLMWatch tracker
  const tracker = new Tracker({
    apiKey: process.env.LLMWATCH_API_KEY || "your-llmwatch-api-key",
    debug: true,
  });

  // Create tracked model
  const gemini = createGeminiTokenTracker(model, tracker);

  console.log("=== Streaming Generation ===\n");

  // Streaming generation
  const result = await gemini
    .withContext({
      feature: "streaming-example",
      user: "demo-user",
      sessionId: "session-123",
    })
    .generateContentStream(
      "Write a detailed explanation of how neural networks work",
    );

  console.log("Streaming response:\n");

  // Process the stream
  for await (const chunk of result.stream) {
    const chunkText = chunk.text();
    process.stdout.write(chunkText);
  }

  console.log("\n\n=== Stream Complete ===\n");

  // Access full response and tracking data
  const response = await result.response;
  console.log("Tracking Data:", result.trackLlmResponse);
  console.log("Usage Metadata:", response.usageMetadata);
}

main().catch(console.error);
