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

  console.log("=== Chat Session Example ===\n");

  // Start a chat session
  const chat = gemini
    .withContext({
      feature: "chatbot",
      user: "demo-user",
      conversationId: "conv-123",
    })
    .chats.create({
      model: "gemini-2.5-flash",
      history: [
        {
          role: "user",
          parts: [{ text: "Hello! I'm interested in learning about AI." }],
        },
        {
          role: "model",
          parts: [
            {
              text: "That's wonderful! I'd be happy to help you learn about AI. What specific aspect would you like to explore?",
            },
          ],
        },
      ],
      config: {
        maxOutputTokens: 100,
      },
    });

  // First message
  console.log("User: What is machine learning?\n");
  const result1 = await chat
    .withTracking({
      feature: "first-message",
    })
    .sendMessage({
      message: "What is machine learning?",
    });
  console.log("Assistant:", result1.text);
  console.log("\nTracking 1:", result1.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(50) + "\n");

  // Second message (continues the conversation)
  console.log("User: Can you give me a simple example?\n");
  const result2 = await chat.sendMessage({
    message: "Can you give me a simple example?",
  });
  console.log("Assistant:", result2.text);
  console.log("\nTracking 2:", result2.fluxGateCostTrackingResponse);

  console.log("\n" + "=".repeat(50) + "\n");

  // Streaming message in chat
  console.log("User: Tell me more about neural networks\n");
  console.log("Assistant: ");
  const stream = await chat.sendMessageStream({
    message: "Tell me more about neural networks",
  });

  for await (const chunk of stream) {
    process.stdout.write(chunk.text ?? "");
  }

  console.log("\n\nTracking 3:", stream.fluxGateCostTrackingResponse);
  console.log("History length:", chat.getHistory().length);
}

main().catch(console.error);
