/**
 * Wraps an async iterable and records `trackLlmResponse` once the stream is
 * fully consumed (or errors). Access `stream.trackLlmResponse` after the
 * `for await` loop completes.
 */
export class TrackedStream {
    constructor(source, finalize) {
        this.source = source;
        this.finalize = finalize;
    }
    async *[Symbol.asyncIterator]() {
        let last;
        let streamError;
        try {
            for await (const item of this.source) {
                last = item;
                yield item;
            }
        }
        catch (err) {
            streamError = err;
            throw err;
        }
        finally {
            this.trackLlmResponse = await this.finalize(last, streamError);
        }
    }
}
