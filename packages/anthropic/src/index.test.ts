import { describe, it, expect, beforeEach } from "vitest";
import { createAnthropicCostTracker } from "./index.js";
import { FluxGate } from "@fluxgate/sdk";
import Anthropic from "@anthropic-ai/sdk";

describe("createAnthropicCostTracker", () => {
  let mockClient: Anthropic;
  let mockFluxGate: FluxGate;

  beforeEach(() => {
    mockClient = new Anthropic({
      apiKey: "test-key",
    });

    mockFluxGate = new FluxGate({
      apiKey: "tracker-key",
      endpoint: "https://test.example.com",
    });
  });

  describe("initialization", () => {
    it("should create a tracker with withContext method", () => {
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);

      expect(tracker).toHaveProperty("withContext");
      expect(tracker).toHaveProperty("client");
      expect(typeof tracker.withContext).toBe("function");
    });

    it("should return wrapped client with context", () => {
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);
      const contextClient = tracker.withContext({ feature: "test-feature" });

      expect(contextClient).toBeDefined();
      expect(contextClient.messages).toBeDefined();
      expect(contextClient.messages.create).toBeDefined();
      expect(typeof contextClient.messages.create).toBe("function");
    });

    it("should return wrapped client without context", () => {
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);
      const defaultClient = tracker.client;

      expect(defaultClient).toBeDefined();
      expect(defaultClient.messages).toBeDefined();
      expect(defaultClient.messages.create).toBeDefined();
      expect(typeof defaultClient.messages.create).toBe("function");
    });
  });

  describe("context handling", () => {
    it("should accept user context with string user", () => {
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);
      const contextClient = tracker.withContext({
        feature: "chat",
        user: "user-123",
        sessionId: "session-456",
      });

      expect(contextClient).toBeDefined();
    });

    it("should accept user context with TrackedUser object", () => {
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);
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
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);
      const contextClient = tracker.withContext({
        feature: "chat",
        step: "generation",
        region: "us-east-1",
      });

      expect(contextClient).toBeDefined();
    });
  });

  describe("multiple contexts", () => {
    it("should allow creating multiple wrapped clients with different contexts", () => {
      const tracker = createAnthropicCostTracker(mockClient, mockFluxGate);

      const chatContext = tracker.withContext({ feature: "chat" });
      const summaryContext = tracker.withContext({ feature: "summary" });

      expect(chatContext).toBeDefined();
      expect(summaryContext).toBeDefined();
      expect(chatContext).not.toBe(summaryContext);
    });
  });
});
