import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAITokenTracker } from "@fluxgate/openai";

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
  const openai = createOpenAITokenTracker(client, fluxgate);

  console.log("=== Basic Chat Completion ===\n");

  // Basic chat completion
  const completion = await openai
    .withContext({
      feature: "example-chat",
      user: "demo-user",
    })
    .chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "What is TypeScript?" },
      ],
    });

  console.log("Response:", completion.choices[0].message.content);
  console.log("\nTracking Data:", completion.trackLlmResponse);
  console.log("\nUsage:", completion.usage);
}

main().catch(console.error);
