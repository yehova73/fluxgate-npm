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

  console.log("=== Chat Session Example ===\n");

  // Start a chat session
  const chat = gemini
    .withContext({
      feature: "chatbot",
      user: "demo-user",
      conversationId: "conv-123",
    })
    .startChat({
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
      generationConfig: {
        maxOutputTokens: 100,
      },
    });

  // First message
  console.log("User: What is machine learning?\n");
  const result1 = await chat.sendMessage("What is machine learning?");
  console.log("Assistant:", result1.response.text());
  console.log("\nTracking 1:", result1.trackLlmResponse);

  console.log("\n" + "=".repeat(50) + "\n");

  // Second message (continues the conversation)
  console.log("User: Can you give me a simple example?\n");
  const result2 = await chat.sendMessage("Can you give me a simple example?");
  console.log("Assistant:", result2.response.text());
  console.log("\nTracking 2:", result2.trackLlmResponse);

  console.log("\n" + "=".repeat(50) + "\n");

  // Streaming message in chat
  console.log("User: Tell me more about neural networks\n");
  console.log("Assistant: ");
  const result3 = await chat.sendMessageStream(
    "Tell me more about neural networks",
  );

  for await (const chunk of result3.stream) {
    process.stdout.write(chunk.text());
  }

  const response3 = await result3.response;
  console.log("\n\nTracking 3:", result3.trackLlmResponse);
  console.log("Usage:", response3.usageMetadata);
}

main().catch(console.error);
