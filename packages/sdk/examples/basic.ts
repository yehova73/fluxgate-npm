import { FluxGate } from "@fluxgate/sdk";

async function main() {
  // Initialize fluxgate instance
  const instance = new FluxGate({
    apiKey: process.env.FLUXGATE_API_KEY || "your-api-key-here",
    endpoint: "https://fluxgate.app/api/events",
    timeout: 5000,
    debug: true, // Enable to see detailed logs
  });

  console.log("=== Basic Event Tracking ===\n");

  // Track a simple success event
  const response1 = await instance.recordEvent({
    provider: "openai",
    model: "gpt-4o",
    feature: "example-basic",
    performance: {
      latency: 1500,
      status: "SUCCESS",
      isStreamed: false,
    },
    usage: {
      promptTokens: 100,
      completionTokens: 50,
    },
  });

  console.log("Response 1:", response1);
  console.log();

  // Track event with full metadata (user session, caching, streaming)
  const response2 = await instance.recordEvent({
    provider: "openai",
    model: "gpt-4-turbo",
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
    performance: {
      latency: 2500,
      status: "SUCCESS",
      isStreamed: true,
      streamDuration: 2200,
    },
    usage: {
      promptTokens: 200,
      completionTokens: 150,
      cacheReadTokens: 50,
    },
    metadata: {
      customField: "any custom data",
    },
  });

  console.log("Response 2:", response2);
  console.log();

  // Track an error event
  const response3 = await instance.recordEvent({
    provider: "openai",
    model: "gpt-4o",
    feature: "example-error",
    user: "user-456",
    performance: {
      latency: 300,
      status: "ERROR",
      isStreamed: false,
      errorMessage: "API rate limit exceeded",
    },
    usage: {
      promptTokens: 50,
      completionTokens: 0,
    },
  });

  console.log("Response 3 (Error):", response3);
  console.log();

  // Track a blocked / content-filtered event
  const response4 = await instance.recordEvent({
    provider: "openai",
    model: "gpt-4o",
    feature: "moderation",
    performance: {
      latency: 200,
      status: "CONTENT_FILTER",
      isStreamed: false,
    },
    usage: {
      promptTokens: 30,
      completionTokens: 0,
    },
  });

  console.log("Response 4 (Blocked):", response4);
}

main().catch(console.error);
