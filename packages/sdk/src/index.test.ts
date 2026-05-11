import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { FluxGate } from "./index.js";
import type { LLMEvent } from "./types/types.js";

describe("FluxGate", () => {
  let instance: FluxGate;
  const mockApiKey = "test-api-key";
  const mockEndpoint = "https://test.example.com/api/events";

  // Mock fetch globally
  const originalFetch = global.fetch;

  beforeEach(() => {
    instance = new FluxGate({
      apiKey: mockApiKey,
      endpoint: mockEndpoint,
      timeout: 5000,
      debug: false,
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should throw error if apiKey is not provided", () => {
      expect(
        () =>
          new FluxGate({
            apiKey: "",
          }),
      ).toThrow("FluxGate requires an apiKey in config");
    });

    it("should use default endpoint if not provided", () => {
      const defaultTracker = new FluxGate({ apiKey: "test" });
      expect(defaultTracker).toBeDefined();
    });

    it("should use custom endpoint if provided", () => {
      const customTracker = new FluxGate({
        apiKey: "test",
        endpoint: "https://custom.example.com",
      });
      expect(customTracker).toBeDefined();
    });

    it("should use default timeout if not provided", () => {
      const defaultTracker = new FluxGate({ apiKey: "test" });
      expect(defaultTracker).toBeDefined();
    });
  });

  describe("recordEvent", () => {
    it("should send event to the correct endpoint", async () => {
      const mockResponse = {
        id: "event-123",
        createdAt: "2026-05-05T00:00:00Z",
        cost: 0.001,
      };

      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          model: "gpt-4",
          provider: "openai",
          latencyInMs: 1000,
        },
        status: "SUCCESS",
        metadata: {
          feature: "chat",
          user: "user-123",
        },
      };

      const result = await instance.recordEvent(event);

      expect(fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockApiKey}`,
            "User-Agent": "@fluxgate/sdk/0.0.1",
          }),
          body: JSON.stringify(event),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it("should default status to SUCCESS if not provided", async () => {
      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            id: "123",
            createdAt: "2026-05-05T00:00:00Z",
            cost: 0.001,
          }),
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      await instance.recordEvent(event);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.status).toBe("SUCCESS");
    });

    it("should handle fetch errors gracefully", async () => {
      const mockResponse = {
        id: "event-123",
        createdAt: "2026-05-05T00:00:00Z",
        cost: 0.001,
      };

      vi.mocked(fetch).mockResolvedValue({
        status: 500,
        statusText: "Internal Server Error",
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      const result = await instance.recordEvent(event);
      expect(result).toEqual(mockResponse);
    });

    it("should handle invalid JSON response", async () => {
      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: async () => "invalid json",
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      const result = await instance.recordEvent(event);
      expect(result).toBeNull();
    });

    it("should respect timeout setting", async () => {
      const shortTimeoutTracker = new FluxGate({
        apiKey: mockApiKey,
        endpoint: mockEndpoint,
        timeout: 100,
      });

      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  status: 200,
                  statusText: "OK",
                  text: async () => JSON.stringify({}),
                } as Response),
              1000,
            );
          }),
      );

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      await expect(shortTimeoutTracker.recordEvent(event)).rejects.toThrow();
    });

    it("should include complex metadata in the event", async () => {
      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            id: "123",
            createdAt: "2026-05-05T00:00:00Z",
            cost: 0.001,
          }),
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          cachedTokens: 20,
          model: "gpt-4",
          provider: "openai",
          latencyInMs: 1500,
          isStreamed: true,
          streamingDurationInMs: 2000,
        },
        status: "SUCCESS",
        metadata: {
          feature: "chat",
          step: "generation",
          user: {
            id: "user-123",
            name: "Test User",
            email: "test@example.com",
            monthlyRevenue: 99.99,
          },
          sessionId: "session-456",
          conversationId: "conv-789",
          customField: "custom value",
        },
      };

      await instance.recordEvent(event);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.usage).toEqual(event.usage);
      expect(body.metadata).toEqual(event.metadata);
    });

    it("should handle status with error message", async () => {
      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            id: "123",
            createdAt: "2026-05-05T00:00:00Z",
            cost: null,
          }),
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 0,
        },
        status: {
          status: "ERROR",
          errorMessage: "API call failed",
        },
      };

      await instance.recordEvent(event);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.status).toEqual(event.status);
    });
  });

  describe("debug mode", () => {
    it("should log debug information when debug is enabled", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const debugTracker = new FluxGate({
        apiKey: mockApiKey,
        endpoint: mockEndpoint,
        debug: true,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "[fluxgate] FluxGate initialized",
        expect.any(Object),
      );

      vi.mocked(fetch).mockResolvedValue({
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            id: "123",
            createdAt: "2026-05-05T00:00:00Z",
            cost: 0.001,
          }),
      } as Response);

      const event: LLMEvent = {
        usage: {
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      await debugTracker.recordEvent(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[fluxgate] Sending event"),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });
  });
});
