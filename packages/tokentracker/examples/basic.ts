import { Tracker } from "@llmwatch/tokentracker";

async function main() {
  // Initialize tracker
  const tracker = new Tracker({
    apiKey: process.env.LLMWATCH_API_KEY || "your-api-key-here",
    endpoint: "https://llmwatch.vercel.com/api/events",
    timeout: 5000,
    debug: true, // Enable to see detailed logs
  });

  console.log("=== Basic Event Tracking ===\n");

  // Track a simple success event
  const response1 = await tracker.recordEvent({
    usage: {
      inputTokens: 100,
      outputTokens: 50,
      model: "gpt-4",
      provider: "openai",
      latencyInMs: 1500,
    },
    status: "SUCCESS",
    metadata: {
      feature: "example-basic",
    },
  });

  console.log("Response 1:", response1);
  console.log();

  // Track event with full metadata
  const response2 = await tracker.recordEvent({
    usage: {
      inputTokens: 200,
      outputTokens: 150,
      cachedTokens: 50,
      model: "gpt-4-turbo",
      provider: "openai",
      latencyInMs: 2500,
      isStreamed: true,
      streamingDurationInMs: 3000,
    },
    status: "SUCCESS",
    metadata: {
      feature: "chat",
      step: "conversation",
      user: {
        id: "user-123",
        name: "John Doe",
        email: "john@example.com",
        monthlyRevenue: 99.99,
      },
      sessionId: "session-abc",
      conversationId: "conv-xyz",
      customField: "any custom data",
    },
  });

  console.log("Response 2:", response2);
  console.log();

  // Track an error event
  const response3 = await tracker.recordEvent({
    usage: {
      inputTokens: 50,
      outputTokens: 0,
      model: "gpt-4",
      provider: "openai",
    },
    status: {
      status: "ERROR",
      errorMessage: "API rate limit exceeded",
    },
    metadata: {
      feature: "example-error",
      user: "user-456",
    },
  });

  console.log("Response 3 (Error):", response3);
  console.log();

  // Track a blocked event
  const response4 = await tracker.recordEvent({
    usage: {
      inputTokens: 30,
      outputTokens: 0,
    },
    status: "CONTENT_FILTER",
    metadata: {
      feature: "moderation",
    },
  });

  console.log("Response 4 (Blocked):", response4);
}

main().catch(console.error);
