import { GoogleGenerativeAI } from "@google/generative-ai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiTokenTracker } from "@fluxgate/gemini";

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
  const gemini = createGeminiTokenTracker(model, fluxgate);

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
