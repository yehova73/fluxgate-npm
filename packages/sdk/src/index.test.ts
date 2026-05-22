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
        recordId: "event-123",
        totalTokens: 150,
        totalCost: 0.001,
        status: "ok" as const,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 201,
        statusText: "Created",
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4",
        feature: "chat",
        user: "user-123",
        performance: { latency: 1000, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      const result = await instance.recordEvent(event);

      expect(fetch).toHaveBeenCalledWith(
        mockEndpoint,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockApiKey}`,
            "User-Agent": "@fluxgate/sdk/0.0.5",
          }),
          body: JSON.stringify(event),
        }),
      );

      expect(result).toEqual(mockResponse);
    });

    it("should send event body unchanged to the API", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            recordId: "123",
            totalTokens: 150,
            totalCost: 0.001,
            status: "ok",
          }),
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      await instance.recordEvent(event);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body).toEqual(event);
    });

    it("should return null for non-2xx responses", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => JSON.stringify({ error: "server error" }),
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      const result = await instance.recordEvent(event);
      expect(result).toBeNull();
    });

    it("should handle invalid JSON response", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "invalid json",
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
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
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      await expect(shortTimeoutTracker.recordEvent(event)).resolves.toBeNull();
    });

    it("should include complex metadata in the event", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
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
        provider: "openai",
        model: "gpt-4",
        feature: "chat",
        step: "generation",
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          monthlyRevenue: "99.99",
        },
        sessionId: "session-456",
        conversationId: "conv-789",
        performance: {
          latency: 1500,
          status: "SUCCESS",
          isStreamed: true,
          streamDuration: 2000,
        },
        usage: { promptTokens: 100, completionTokens: 50, cacheReadTokens: 20 },
        metadata: { customField: "custom value" },
      };

      await instance.recordEvent(event);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.usage).toEqual(event.usage);
      expect(body.metadata).toEqual(event.metadata);
    });

    it("should handle status with error message", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
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
        provider: "openai",
        model: "gpt-4o",
        performance: {
          latency: 500,
          status: "ERROR",
          isStreamed: false,
          errorMessage: "API call failed",
        },
        usage: { promptTokens: 100, completionTokens: 0 },
      };

      await instance.recordEvent(event);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.performance.status).toEqual("ERROR");
      expect(body.performance.errorMessage).toEqual("API call failed");
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
        ok: true,
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
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      await debugTracker.recordEvent(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[fluxgate] Sending event"),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it("should log network errors when debug is enabled", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const debugTracker = new FluxGate({
        apiKey: mockApiKey,
        endpoint: mockEndpoint,
        debug: true,
      });

      vi.mocked(fetch).mockRejectedValue(new Error("network down"));

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      const result = await debugTracker.recordEvent(event);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        "[fluxgate] Network error sending event:",
        expect.any(Error),
      );

      errorSpy.mockRestore();
    });

    it("should log non-2xx responses when debug is enabled", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const debugTracker = new FluxGate({
        apiKey: mockApiKey,
        endpoint: mockEndpoint,
        debug: true,
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        text: async () => "error",
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      const result = await debugTracker.recordEvent(event);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("non-2xx status: 503"),
        undefined,
      );

      errorSpy.mockRestore();
    });

    it("should log JSON parse errors when debug is enabled", async () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const debugTracker = new FluxGate({
        apiKey: mockApiKey,
        endpoint: mockEndpoint,
        debug: true,
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "not valid json!!!",
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      const result = await debugTracker.recordEvent(event);
      expect(result).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        "[fluxgate] Failed to parse response:",
        expect.any(SyntaxError),
      );

      errorSpy.mockRestore();
    });

    it("should use custom logger when provided", async () => {
      const customLogger = vi.fn();

      const debugTracker = new FluxGate({
        apiKey: mockApiKey,
        endpoint: mockEndpoint,
        debug: true,
        logger: customLogger,
      });

      expect(customLogger).toHaveBeenCalledWith(
        "log",
        "[fluxgate] FluxGate initialized",
        expect.any(Object),
      );

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () =>
          JSON.stringify({
            recordId: "1",
            totalTokens: 10,
            totalCost: 0.001,
            status: "ok",
          }),
      } as Response);

      const event: LLMEvent = {
        provider: "openai",
        model: "gpt-4o",
        performance: { latency: 500, status: "SUCCESS", isStreamed: false },
        usage: { promptTokens: 100, completionTokens: 50 },
      };

      await debugTracker.recordEvent(event);

      expect(customLogger).toHaveBeenCalledWith(
        "log",
        expect.stringContaining("[fluxgate] Sending event"),
        expect.any(String),
      );
      expect(customLogger).toHaveBeenCalledWith(
        "log",
        expect.stringContaining("[fluxgate] Event sent successfully"),
      );
    });
  });
});
