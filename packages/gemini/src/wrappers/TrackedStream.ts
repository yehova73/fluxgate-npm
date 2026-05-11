import type { EnhancedGenerateContentResponse } from "@google/generative-ai";
import { FluxGateCostTrackingResponse } from "@fluxgate/sdk";

/**
 * Wraps a Gemini streaming response to track token usage after completion
 */
export class TrackedStream<
  T = EnhancedGenerateContentResponse,
> implements AsyncIterable<T> {
  fluxGateCostTrackingResponse: FluxGateCostTrackingResponse | undefined;

  constructor(
    private readonly innerStream: AsyncIterable<T>,
    private readonly onComplete: (
      lastChunk: T | undefined,
      error: Error | undefined,
    ) => Promise<FluxGateCostTrackingResponse>,
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let lastChunk: T | undefined;
    let streamError: Error | undefined;

    try {
      for await (const chunk of this.innerStream) {
        lastChunk = chunk;
        yield chunk;
      }
    } catch (err) {
      streamError = err as Error;
      throw err;
    } finally {
      this.fluxGateCostTrackingResponse = await this.onComplete(
        lastChunk,
        streamError,
      );
    }
  }
}
