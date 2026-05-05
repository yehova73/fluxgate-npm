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

  console.log("=== Basic Text Generation ===\n");

  // Basic text generation
  const result = await gemini
    .withContext({
      feature: "example-generation",
      user: "demo-user",
    })
    .generateContent("Explain quantum computing in simple terms");

  console.log("Response:", result.response.text());
  console.log("\nTracking Data:", result.trackLlmResponse);
  console.log("\nUsage Metadata:", result.response.usageMetadata);
}

main().catch(console.error);
