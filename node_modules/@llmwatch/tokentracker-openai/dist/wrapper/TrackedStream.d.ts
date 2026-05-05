import { TrackLlmResponse } from "@llmwatch/tokentracker";
/**
 * Wraps an async iterable and records `trackLlmResponse` once the stream is
 * fully consumed (or errors). Access `stream.trackLlmResponse` after the
 * `for await` loop completes.
 */
export declare class TrackedStream<T> implements AsyncIterable<T> {
    private readonly source;
    private readonly finalize;
    trackLlmResponse: TrackLlmResponse | undefined;
    constructor(source: AsyncIterable<T>, finalize: (lastItem: T | undefined, error: Error | undefined) => Promise<TrackLlmResponse>);
    [Symbol.asyncIterator](): AsyncGenerator<T>;
}
