import type { EnhancedGenerateContentResponse } from "@google/generative-ai";
import { TrackLlmResponse } from "@llmwatch/tokentracker";

/**
 * Wraps a Gemini streaming response to track token usage after completion
 */
export class TrackedStream<T = EnhancedGenerateContentResponse>
  implements AsyncIterable<T>
{
  trackLlmResponse: TrackLlmResponse | undefined;

  constructor(
    private readonly innerStream: AsyncIterable<T>,
    private readonly onComplete: (
      lastChunk: T | undefined,
      error: Error | undefined,
    ) => Promise<TrackLlmResponse>,
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
      this.trackLlmResponse = await this.onComplete(lastChunk, streamError);
    }
  }
}
