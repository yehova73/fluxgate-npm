import { TrackLlmResponse } from "@llmwatch/tokentracker";

/**
 * Wraps an async iterable and records `trackLlmResponse` once the stream is
 * fully consumed (or errors). Access `stream.trackLlmResponse` after the
 * `for await` loop completes.
 */
export class TrackedStream<T> implements AsyncIterable<T> {
  trackLlmResponse: TrackLlmResponse | undefined;

  constructor(
    private readonly source: AsyncIterable<T>,
    private readonly finalize: (
      lastItem: T | undefined,
      error: Error | undefined,
    ) => Promise<TrackLlmResponse>,
  ) {}

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    let last: T | undefined;
    let streamError: Error | undefined;
    try {
      for await (const item of this.source) {
        last = item;
        yield item;
      }
    } catch (err) {
      streamError = err as Error;
      throw err;
    } finally {
      this.trackLlmResponse = await this.finalize(last, streamError);
    }
  }
}
