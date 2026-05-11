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

  console.log("=== Multiple Contexts Example ===\n");
  console.log("Simulating different features in the same app\n");

  // Context 1: Chatbot feature
  console.log("1. CHATBOT FEATURE");
  const chatClient = openai.withContext({
    feature: "chatbot",
    user: {
      id: "user-123",
      name: "Alice",
      email: "alice@example.com",
      monthlyRevenue: 29.99,
    },
    sessionId: "session-abc",
  });

  const chatResponse = await chatClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Hello, how are you?" }],
  });

  console.log("Response:", chatResponse.choices[0].message.content);
  console.log("Tracking:", chatResponse.trackLlmResponse);
  console.log();

  // Context 2: Code generation feature
  console.log("2. CODE GENERATION FEATURE");
  const codeClient = openai.withContext({
    feature: "code-generation",
    user: "user-456",
    step: "generate",
    language: "typescript",
  });

  const codeResponse = await codeClient.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: "Write a TypeScript function to calculate fibonacci",
      },
    ],
  });

  console.log("Response:", codeResponse.choices[0].message.content);
  console.log("Tracking:", codeResponse.trackLlmResponse);
  console.log();

  // Context 3: Document summarization feature
  console.log("3. DOCUMENT SUMMARIZATION FEATURE");
  const summaryClient = openai.withContext({
    feature: "summarization",
    documentType: "article",
    user: {
      id: "user-789",
      name: "Bob",
      monthlyRevenue: 99.99,
    },
  });

  const summaryResponse = await summaryClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content:
          "Summarize: Machine learning is a subset of AI that enables systems to learn from data.",
      },
    ],
  });

  console.log("Response:", summaryResponse.choices[0].message.content);
  console.log("Tracking:", summaryResponse.trackLlmResponse);
  console.log();

  // Context 4: Embeddings for search
  console.log("4. SEMANTIC SEARCH FEATURE");
  const searchClient = openai.withContext({
    feature: "semantic-search",
    searchType: "documents",
    user: "user-123", // Same user as chatbot, different feature
  });

  const embeddingResponse = await searchClient.embeddings.create({
    model: "text-embedding-ada-002",
    input: "artificial intelligence machine learning",
  });

  console.log(
    "Embedding created with dimensions:",
    embeddingResponse.data[0].embedding.length,
  );
  console.log("Tracking:", embeddingResponse.trackLlmResponse);
  console.log();

  // Context 5: Streaming content generation
  console.log("5. STREAMING CONTENT GENERATION");
  const contentClient = openai.withContext({
    feature: "content-generation",
    contentType: "blog-post",
    user: {
      id: "user-999",
      name: "Charlie",
      monthlyRevenue: 199.99,
    },
  });

  const stream = await contentClient.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "user", content: "Write a short intro for a tech blog post" },
    ],
    stream: true,
  });

  process.stdout.write("Response: ");
  for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }

  console.log("\n\nTracking:", stream.trackLlmResponse);
  console.log();

  console.log("=".repeat(60));
  console.log("\nAll 5 features tracked separately with their own context!");
  console.log("Check your LLMWatch dashboard to see the breakdown by feature.");
}

main().catch(console.error);
