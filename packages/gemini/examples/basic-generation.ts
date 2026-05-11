import { GoogleGenerativeAI } from "@google/generative-ai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

async function main() {
  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || "your-gemini-api-key",
  );
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Initialize FluxGate instance
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  // Create tracked model
  const gemini = createGeminiCostTracker(model, fluxgate);

  console.log("=== Basic Text Generation ===\n");

  // Basic text generation
  const result = await gemini
    .withContext({
      feature: "example-generation",
      user: "demo-user",
    })
    .generateContent("Explain quantum computing in simple terms");

  console.log("Response:", result.response.text());
  console.log("\nTracking Data:", result.fluxGateCostTrackingResponse);
  console.log("\nUsage Metadata:", result.response.usageMetadata);
}

main().catch(console.error);
