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

  console.log("=== Streaming Chat Completion ===\n");

  // Streaming chat completion
  const stream = await openai
    .withContext({
      feature: "streaming-example",
      user: "demo-user",
      sessionId: "session-123",
    })
    .chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Write a short poem about programming",
        },
      ],
      stream: true,
    });

  console.log("Streaming response:\n");

  // Process the stream
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    process.stdout.write(content);
  }

  console.log("\n\n=== Stream Complete ===\n");

  // Access tracking data after stream completes
  console.log("Tracking Data:", stream.fluxGateCostTrackingResponse);
}

main().catch(console.error);
