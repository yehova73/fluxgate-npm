import { GoogleGenAI } from "@google/genai";
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

  console.log("=== Streaming Generation ===\n");

  // Streaming generation
  const stream = await gemini
    .withContext({
      feature: "streaming-example",
      user: "demo-user",
      sessionId: "session-123",
    })
    .models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: "Write a detailed explanation of how neural networks work",
    });

  console.log("Streaming response:\n");

  // Process the stream
  for await (const chunk of stream) {
    process.stdout.write(chunk.text ?? "");
  }

  console.log("\n\n=== Stream Complete ===\n");

  // Access tracking data after stream is fully consumed
  console.log("Tracking Data:", stream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
