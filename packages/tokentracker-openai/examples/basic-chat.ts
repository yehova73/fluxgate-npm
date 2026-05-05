import OpenAI from "openai";
import { Tracker } from "@llmwatch/tokentracker";
import { createOpenAITokenTracker } from "@llmwatch/tokentracker-openai";

async function main() {
  // Initialize OpenAI client
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Initialize LLMWatch tracker
  const tracker = new Tracker({
    apiKey: process.env.LLMWATCH_API_KEY || "your-llmwatch-api-key",
    debug: true,
  });

  // Create tracked client
  const openai = createOpenAITokenTracker(client, tracker);

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
