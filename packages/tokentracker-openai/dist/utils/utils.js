export function isAsyncIterable(obj) {
    return obj && typeof obj[Symbol.asyncIterator] === "function";
}
