import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

async function main() {
  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize FluxGate instance
  const fluxgate = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
    debug: true,
  });

  // Create tracked client
  const openai = createOpenAICostTracker(client, fluxgate);

  console.log("=== Error Handling Example ===\n");

  // Example 1: Invalid model
  console.log("1. Testing with invalid model...");
  try {
    await openai
      .withContext({
        feature: "error-handling",
        user: "demo-user",
      })
      .chat.completions.create({
        model: "invalid-model-name",
        messages: [{ role: "user", content: "Hello" }],
      });
  } catch (error: any) {
    console.log("Caught error (expected):", error.message);
    console.log("Error was tracked automatically\n");
  }

  // Example 2: Streaming with error handling
  console.log("2. Testing streaming with error handling...");
  try {
    const stream = await openai
      .withContext({
        feature: "streaming-error-test",
      })
      .chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Tell me a story" }],
        stream: true,
      });

    let chunkCount = 0;
    for await (const chunk of stream) {
      chunkCount++;
      process.stdout.write(chunk.choices[0]?.delta?.content || "");
    }

    console.log(`\n\nSuccessfully processed ${chunkCount} chunks`);
    console.log("Tracking Data:", stream.fluxGateCostTrackingResponse);
  } catch (error: any) {
    console.log("\nStream error:", error.message);
  }

  // Example 3: Graceful degradation
  console.log("\n3. Demonstrating graceful degradation...");

  // Even if tracking service is down, your app continues
  const instanceWithBadEndpoint = new FluxGate({
    apiKey: "test-key",
    endpoint: "https://invalid-endpoint-that-doesnt-exist.com",
    timeout: 1000,
    debug: false, // Disable debug to avoid noise
  });

  const openaiWithBadInstance = createOpenAICostTracker(
    client,
    instanceWithBadEndpoint,
  );

  try {
    const result = await openaiWithBadInstance.client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello!" }],
    });

    console.log("Response received:", result.choices[0].message.content);
    console.log("Tracking failed silently, but app continued working");
    console.log("Tracking Data:", result.fluxGateCostTrackingResponse);
  } catch (error: any) {
    console.log("App error:", error.message);
  }
}

main().catch(console.error);
