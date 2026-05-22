export function isAsyncIterable<T>(obj: unknown): obj is AsyncIterable<T> {
  return (
    obj != null &&
    typeof (obj as Record<symbol, unknown>)[Symbol.asyncIterator] === "function"
  );
}

type CacheControlBlock = { cache_control?: { ttl?: string } };
type MessageLike = {
  system?: unknown;
  messages?: Array<{ content?: unknown }>;
};

/**
 * Detects if any content block in the request has prompt caching enabled and
 * returns the TTL string (e.g. "5m", "1h"). Returns undefined if no cache_control
 * is present.
 */
export function detectCacheTtl(params: MessageLike): string | undefined {
  if (Array.isArray(params.system)) {
    for (const block of params.system as CacheControlBlock[]) {
      if (block?.cache_control) return block.cache_control.ttl ?? "5m";
    }
  }
  if (Array.isArray(params.messages)) {
    for (const msg of params.messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content as CacheControlBlock[]) {
          if (block?.cache_control) return block.cache_control.ttl ?? "5m";
        }
      }
    }
  }
  return undefined;
}
