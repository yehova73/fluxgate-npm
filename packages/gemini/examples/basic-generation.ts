import { GoogleGenAI, ServiceTier } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

async function main() {
  // Initialize Gemini
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

  console.log("=== Basic Text Generation ===\n");

  // Basic text generation
  const result = await gemini
    .withContext({
      feature: "example-generation",
      user: "demo-user",
    })
    .generateContent({
      model: "gemini-2.5-flash",
      config: { serviceTier: ServiceTier.PRIORITY },
      contents: "Explain quantum computing in simple terms",
    });

  console.log("Response:", result.text);
  console.log("\nTracking Data:", result.fluxGateCostTrackingResponse);
  console.log("\nUsage Metadata:", result.usageMetadata);
}

main().catch(console.error);
