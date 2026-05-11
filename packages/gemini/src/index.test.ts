import { describe, it, expect, beforeEach, vi } from "vitest";
import { createGeminiTokenTracker } from "./index.js";
import { FluxGate } from "@fluxgate/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

describe("createGeminiTokenTracker", () => {
  let mockModel: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
  let mockFluxGate: FluxGate;

  beforeEach(() => {
    const genAI = new GoogleGenerativeAI("test-key");
    mockModel = genAI.getGenerativeModel({ model: "gemini-pro" });

    mockFluxGate = new FluxGate({
      apiKey: "tracker-key",
      endpoint: "https://test.example.com",
    });
  });

  describe("initialization", () => {
    it("should create a tracker with withContext method", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);

      expect(tracker).toHaveProperty("withContext");
      expect(tracker).toHaveProperty("model");
      expect(typeof tracker.withContext).toBe("function");
    });

    it("should return wrapped model with context", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const contextModel = tracker.withContext({ feature: "test-feature" });

      expect(contextModel).toBeDefined();
      expect(contextModel.generateContent).toBeDefined();
      expect(contextModel.generateContentStream).toBeDefined();
      expect(contextModel.embedContent).toBeDefined();
      expect(contextModel.startChat).toBeDefined();
    });

    it("should return wrapped model without context", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const defaultModel = tracker.model;

      expect(defaultModel).toBeDefined();
      expect(defaultModel.generateContent).toBeDefined();
      expect(defaultModel.generateContentStream).toBeDefined();
      expect(defaultModel.embedContent).toBeDefined();
      expect(defaultModel.startChat).toBeDefined();
    });
  });

  describe("context handling", () => {
    it("should accept user context with string user", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const contextModel = tracker.withContext({
        feature: "chat",
        user: "user-123",
        sessionId: "session-456",
      });

      expect(contextModel).toBeDefined();
    });

    it("should accept user context with TrackedUser object", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const contextModel = tracker.withContext({
        feature: "chat",
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          monthlyRevenue: 99.99,
        },
        conversationId: "conv-789",
      });

      expect(contextModel).toBeDefined();
    });

    it("should accept metadata with custom fields", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const contextModel = tracker.withContext({
        feature: "generation",
        step: "content-creation",
        customField: "custom value",
        anotherField: 123,
      });

      expect(contextModel).toBeDefined();
    });
  });

  describe("wrapped model methods", () => {
    it("should have wrapped generateContent method", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const wrappedModel = tracker.model;

      expect(wrappedModel.generateContent).toBeDefined();
      expect(typeof wrappedModel.generateContent).toBe("function");
    });

    it("should have wrapped generateContentStream method", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const wrappedModel = tracker.model;

      expect(wrappedModel.generateContentStream).toBeDefined();
      expect(typeof wrappedModel.generateContentStream).toBe("function");
    });

    it("should have wrapped embedContent method", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const wrappedModel = tracker.model;

      expect(wrappedModel.embedContent).toBeDefined();
      expect(typeof wrappedModel.embedContent).toBe("function");
    });

    it("should have wrapped startChat method", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const wrappedModel = tracker.model;

      expect(wrappedModel.startChat).toBeDefined();
      expect(typeof wrappedModel.startChat).toBe("function");
    });
  });

  describe("multiple contexts", () => {
    it("should allow creating multiple wrapped models with different contexts", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);

      const chatContext = tracker.withContext({ feature: "chat" });
      const summaryContext = tracker.withContext({ feature: "summary" });

      expect(chatContext).toBeDefined();
      expect(summaryContext).toBeDefined();
      expect(chatContext).not.toBe(summaryContext);
    });
  });

  describe("model preservation", () => {
    it("should preserve original model name", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const wrappedModel = tracker.model;

      expect(wrappedModel.model).toBe(mockModel.model);
    });

    it("should preserve other model properties", () => {
      const tracker = createGeminiTokenTracker(mockModel, mockFluxGate);
      const wrappedModel = tracker.model;

      // Should have access to all original model properties
      expect(wrappedModel.generationConfig).toBe(mockModel.generationConfig);
      expect(wrappedModel.safetySettings).toBe(mockModel.safetySettings);
    });
  });
});
