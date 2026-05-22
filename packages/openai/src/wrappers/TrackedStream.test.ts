import { describe, it, expect, vi } from "vitest";
import { TrackedStream } from "./TrackedStream.js";
import type { FluxGateCostTrackingResponse } from "@fluxgate/sdk";

describe("TrackedStream", () => {
  async function* createMockStream<T>(items: T[]): AsyncGenerator<T> {
    for (const item of items) {
      yield item;
    }
  }

  async function* createErrorStream<T>(
    items: T[],
    errorAt: number,
  ): AsyncGenerator<T> {
    for (let i = 0; i < items.length; i++) {
      if (i === errorAt) {
        throw new Error("Stream error");
      }
      yield items[i];
    }
  }

  describe("successful streams", () => {
    it("should iterate through all items", async () => {
      const items = [1, 2, 3, 4, 5];
      const source = createMockStream(items);
      const finalize = vi.fn().mockResolvedValue({
        status: "SUCCESS",
        cost: 0.001,
        trackingId: "track-123",
        createdAt: 1777939200000,
      } as FluxGateCostTrackingResponse);

      const trackedStream = new TrackedStream(source, finalize);

      const collected: number[] = [];
      for await (const item of trackedStream) {
        collected.push(item);
      }

      expect(collected).toEqual(items);
    });

    it("should call finalize with last item after stream completes", async () => {
      const items = ["a", "b", "c"];
      const source = createMockStream(items);
      const finalize = vi.fn().mockResolvedValue({
        status: "SUCCESS",
        cost: 0.001,
        trackingId: "track-123",
        createdAt: 1777939200000,
      } as FluxGateCostTrackingResponse);

      const trackedStream = new TrackedStream(source, finalize);

      for await (const _ of trackedStream) {
        // consume stream
      }

      expect(finalize).toHaveBeenCalledWith("c", undefined);
    });

    it("should set fluxGateCostTrackingResponse after stream completes", async () => {
      const items = [1, 2, 3];
      const source = createMockStream(items);
      const mockResponse: FluxGateCostTrackingResponse = {
        status: "SUCCESS",
        cost: 0.002,
        trackingId: "track-456",
        createdAt: 1777939200000,
      };
      const finalize = vi.fn().mockResolvedValue(mockResponse);

      const trackedStream = new TrackedStream(source, finalize);

      expect(trackedStream.fluxGateCostTrackingResponse).toBeUndefined();

      for await (const _ of trackedStream) {
        // consume stream
      }

      expect(trackedStream.fluxGateCostTrackingResponse).toEqual(mockResponse);
    });

    it("should handle empty stream", async () => {
      const source = createMockStream<string>([]);
      const finalize = vi.fn().mockResolvedValue({
        status: "SUCCESS",
        cost: 0,
        trackingId: "track-789",
        createdAt: 1777939200000,
      } as FluxGateCostTrackingResponse);

      const trackedStream = new TrackedStream(source, finalize);

      const collected: string[] = [];
      for await (const item of trackedStream) {
        collected.push(item);
      }

      expect(collected).toEqual([]);
      expect(finalize).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe("error handling", () => {
    it("should call finalize with error if stream throws", async () => {
      const items = [1, 2, 3, 4, 5];
      const source = createErrorStream(items, 2);
      const finalize = vi.fn().mockResolvedValue({
        status: "ERROR",
        cost: null,
        trackingId: "track-error",
        createdAt: 1777939200000,
        errorMessage: "Stream error",
      } as FluxGateCostTrackingResponse);

      const trackedStream = new TrackedStream(source, finalize);

      const collected: number[] = [];
      try {
        for await (const item of trackedStream) {
          collected.push(item);
        }
      } catch (error) {
        expect((error as Error).message).toBe("Stream error");
      }

      expect(collected).toEqual([1, 2]);
      expect(finalize).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ message: "Stream error" }),
      );
    });

    it("should set fluxGateCostTrackingResponse even when stream errors", async () => {
      const items = [1, 2, 3];
      const source = createErrorStream(items, 1);
      const mockResponse: FluxGateCostTrackingResponse = {
        status: "ERROR",
        cost: null,
        trackingId: "track-error-2",
        createdAt: 1777939200000,
        errorMessage: "Stream error",
      };
      const finalize = vi.fn().mockResolvedValue(mockResponse);

      const trackedStream = new TrackedStream(source, finalize);

      try {
        for await (const _ of trackedStream) {
          // consume stream
        }
      } catch (error) {
        // expected error
      }

      expect(trackedStream.fluxGateCostTrackingResponse).toEqual(mockResponse);
    });

    it("should propagate the error after calling finalize", async () => {
      const items = [1, 2, 3];
      const source = createErrorStream(items, 1);
      const finalize = vi.fn().mockResolvedValue({
        status: "ERROR",
        cost: null,
        trackingId: null,
        createdAt: null,
        errorMessage: "Stream error",
      } as FluxGateCostTrackingResponse);

      const trackedStream = new TrackedStream(source, finalize);

      await expect(async () => {
        for await (const _ of trackedStream) {
          // consume stream
        }
      }).rejects.toThrow("Stream error");

      expect(finalize).toHaveBeenCalled();
    });
  });

  describe("multiple iterations", () => {
    it("should track last item across full iteration", async () => {
      const items = ["first", "second", "third", "last"];
      const source = createMockStream(items);
      const finalize = vi.fn().mockResolvedValue({
        status: "SUCCESS",
        cost: 0.003,
        trackingId: "track-multi",
        createdAt: 1777939200000,
      } as FluxGateCostTrackingResponse);

      const trackedStream = new TrackedStream(source, finalize);

      let lastSeen: string | undefined;
      for await (const item of trackedStream) {
        lastSeen = item;
      }

      expect(lastSeen).toBe("last");
      expect(finalize).toHaveBeenCalledWith("last", undefined);
    });
  });
});
