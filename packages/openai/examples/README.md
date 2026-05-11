# OpenAI Examples

This directory contains example code demonstrating various features of the @fluxgate/openai package.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- OpenAI API key
- FluxGate API key

## Setup

1. Install dependencies from the root of the monorepo:

   ```bash
   cd ../../..
   npm install
   ```

2. Build all packages:

   ```bash
   npm run build
   ```

3. Set your environment variables:
   ```bash
   export OPENAI_API_KEY="your-openai-api-key"
   export FLUXGATE_API_KEY="your-fluxgate-api-key"
   ```

## Running Examples

### Basic Chat

```bash
npx tsx packages/openai/examples/basic-chat.ts
```

Demonstrates basic chat completions with tracking.

### Streaming

```bash
npx tsx packages/openai/examples/streaming.ts
```

Shows how to use streaming responses with automatic tracking.

### Embeddings

```bash
npx tsx packages/openai/examples/embeddings.ts
```

Examples of creating embeddings with tracking for semantic search.

### Error Handling

```bash
npx tsx packages/openai/examples/error-handling.ts
```

Demonstrates error tracking and graceful degradation.

### Multiple Contexts

```bash
npx tsx packages/openai/examples/multiple-contexts.ts
```

Shows how to use different contexts for different features in your app.

## Example Files

- **`basic-chat.ts`** - Simple chat completion example
- **`streaming.ts`** - Streaming responses with tracking
- **`embeddings.ts`** - Creating embeddings for semantic search
- **`error-handling.ts`** - Error tracking and graceful degradation
- **`multiple-contexts.ts`** - Using multiple contexts for different features

## What Gets Tracked

Each example automatically tracks:

- ✅ Input tokens (prompt)
- ✅ Output tokens (completion)
- ✅ Cached tokens (if using prompt caching)
- ✅ Total tokens
- ✅ Model name
- ✅ Latency in milliseconds
- ✅ Whether the request was streamed
- ✅ Stream duration (for streaming requests)
- ✅ Finish reason (stop, length, content_filter, etc.)
- ✅ Errors and error messages

## Notes

- All examples use environment variables for API keys
- Debug mode is enabled to show detailed logging
- Examples are written in TypeScript and use the `tsx` runner
- Tracking failures never break your application

## Learn More

- [Package Documentation](../README.md)
- [Core SDK](../../sdk/README.md)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
