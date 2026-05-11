import { FluxGateCostTrackingResponse } from "@fluxgate/sdk";

/**
 * Wraps an async iterable and records `fluxGateCostTrackingResponse` once the stream is
 * fully consumed (or errors). Access `stream.fluxGateCostTrackingResponse` after the
 * `for await` loop completes.
 */
export class TrackedStream<T> implements AsyncIterable<T> {
  fluxGateCostTrackingResponse: FluxGateCostTrackingResponse | undefined;

  constructor(
    private readonly source: AsyncIterable<T>,
    private readonly finalize: (
      lastItem: T | undefined,
      error: Error | undefined,
    ) => Promise<FluxGateCostTrackingResponse>,
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
      this.fluxGateCostTrackingResponse = await this.finalize(
        last,
        streamError,
      );
    }
  }
}
