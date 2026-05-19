import { describe, it, expect, beforeEach, vi } from "vitest";
import { createOpenAICostTracker } from "./index.js";
import { FluxGate } from "@fluxgate/sdk";
import OpenAI from "openai";

describe("createOpenAICostTracker", () => {
  let mockClient: OpenAI;
  let mockFluxgate: FluxGate;

  beforeEach(() => {
    mockClient = new OpenAI({
      apiKey: "test-key",
    });

    mockFluxgate = new FluxGate({
      apiKey: "tracker-key",
      endpoint: "https://test.example.com",
    });
  });

  describe("initialization", () => {
    it("should create a tracker with withContext method", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);

      expect(tracker).toHaveProperty("withContext");
      expect(tracker).toHaveProperty("client");
      expect(typeof tracker.withContext).toBe("function");
    });

    it("should return wrapped client with context", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const contextClient = tracker.withContext({ feature: "test-feature" });

      expect(contextClient).toBeDefined();
      expect(contextClient.chat).toBeDefined();
      expect(contextClient.completions).toBeDefined();
    });

    it("should return wrapped client without context", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const defaultClient = tracker.client;

      expect(defaultClient).toBeDefined();
      expect(defaultClient.chat).toBeDefined();
      expect(defaultClient.completions).toBeDefined();
    });
  });

  describe("context handling", () => {
    it("should accept user context with string user", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const contextClient = tracker.withContext({
        feature: "chat",
        user: "user-123",
        sessionId: "session-456",
      });

      expect(contextClient).toBeDefined();
    });

    it("should accept user context with TrackedUser object", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const contextClient = tracker.withContext({
        feature: "chat",
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          monthlyRevenue: "99.99",
        },
        conversationId: "conv-789",
      });

      expect(contextClient).toBeDefined();
    });

    it("should accept metadata with custom fields", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const contextClient = tracker.withContext({
        feature: "chat",
        step: "generation",
        region: "us-east-1",
      });

      expect(contextClient).toBeDefined();
    });
  });

  describe("wrapped client methods", () => {
    it("should have wrapped chat.completions.create method", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.chat.completions.create).toBeDefined();
      expect(typeof wrappedClient.chat.completions.create).toBe("function");
    });

    it("should have wrapped completions.create method", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.completions.create).toBeDefined();
      expect(typeof wrappedClient.completions.create).toBe("function");
    });

    it("should have wrapped embeddings.create method", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.embeddings.create).toBeDefined();
      expect(typeof wrappedClient.embeddings.create).toBe("function");
    });

    it("should have wrapped responses.create method", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.responses.create).toBeDefined();
      expect(typeof wrappedClient.responses.create).toBe("function");
    });
  });

  describe("multiple contexts", () => {
    it("should allow creating multiple wrapped clients with different contexts", () => {
      const tracker = createOpenAICostTracker(mockClient, mockFluxgate);

      const chatContext = tracker.withContext({ feature: "chat" });
      const summaryContext = tracker.withContext({ feature: "summary" });

      expect(chatContext).toBeDefined();
      expect(summaryContext).toBeDefined();
      expect(chatContext).not.toBe(summaryContext);
    });
  });
});
