import { describe, it, expect, beforeEach } from "vitest";
import { createGeminiCostTracker } from "./index.js";
import { FluxGate } from "@fluxgate/sdk";
import { GoogleGenAI } from "@google/genai";

describe("createGeminiCostTracker", () => {
  let mockAi: GoogleGenAI;
  let mockFluxGate: FluxGate;

  beforeEach(() => {
    mockAi = new GoogleGenAI({ apiKey: "test-key" });

    mockFluxGate = new FluxGate({
      apiKey: "tracker-key",
      endpoint: "https://test.example.com",
    });
  });

  describe("initialization", () => {
    it("should create a tracker with withContext method", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);

      expect(tracker).toHaveProperty("withContext");
      expect(tracker).toHaveProperty("client");
      expect(typeof tracker.withContext).toBe("function");
    });

    it("should return wrapped client with context", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const contextClient = tracker.withContext({ feature: "test-feature" });

      expect(contextClient).toBeDefined();
      expect(contextClient.models.generateContent).toBeDefined();
      expect(contextClient.models.generateContentStream).toBeDefined();
      expect(contextClient.models.embedContent).toBeDefined();
      expect(contextClient.chats.create).toBeDefined();
    });

    it("should return wrapped client without context", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const defaultClient = tracker.client;

      expect(defaultClient).toBeDefined();
      expect(defaultClient.models.generateContent).toBeDefined();
      expect(defaultClient.models.generateContentStream).toBeDefined();
      expect(defaultClient.models.embedContent).toBeDefined();
      expect(defaultClient.chats.create).toBeDefined();
    });
  });

  describe("context handling", () => {
    it("should accept user context with string user", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const contextClient = tracker.withContext({
        feature: "chat",
        user: "user-123",
        sessionId: "session-456",
      });

      expect(contextClient).toBeDefined();
    });

    it("should accept user context with UserSession object", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
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
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const contextClient = tracker.withContext({
        feature: "generation",
        step: "content-creation",
      });

      expect(contextClient).toBeDefined();
    });
  });

  describe("wrapped client methods", () => {
    it("should have wrapped generateContent method", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.models.generateContent).toBeDefined();
      expect(typeof wrappedClient.models.generateContent).toBe("function");
    });

    it("should have wrapped generateContentStream method", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.models.generateContentStream).toBeDefined();
      expect(typeof wrappedClient.models.generateContentStream).toBe(
        "function",
      );
    });

    it("should have wrapped embedContent method", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.models.embedContent).toBeDefined();
      expect(typeof wrappedClient.models.embedContent).toBe("function");
    });

    it("should have wrapped chats.create method", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);
      const wrappedClient = tracker.client;

      expect(wrappedClient.chats.create).toBeDefined();
      expect(typeof wrappedClient.chats.create).toBe("function");
    });
  });

  describe("multiple contexts", () => {
    it("should allow creating multiple wrapped clients with different contexts", () => {
      const tracker = createGeminiCostTracker(mockAi, mockFluxGate);

      const chatContext = tracker.withContext({ feature: "chat" });
      const summaryContext = tracker.withContext({ feature: "summary" });

      expect(chatContext).toBeDefined();
      expect(summaryContext).toBeDefined();
      expect(chatContext).not.toBe(summaryContext);
    });
  });
});
