# Gemini Examples

This directory contains example code demonstrating various features of the @fluxgate/gemini package.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Google Gemini API key
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
   export GEMINI_API_KEY="your-gemini-api-key"
   export FLUXGATE_API_KEY="your-fluxgate-api-key"
   ```

   To get a Gemini API key, visit: https://makersuite.google.com/app/apikey

## Running Examples

### Basic Generation

```bash
npx tsx packages/gemini/examples/basic-generation.ts
```

Demonstrates basic text generation with tracking.

### Streaming

```bash
npx tsx packages/gemini/examples/streaming.ts
```

Shows how to use streaming responses with automatic tracking.

### Chat Session

```bash
npx tsx packages/gemini/examples/chat-session.ts
```

Multi-turn conversations with context preservation and tracking.

### Embeddings

```bash
npx tsx packages/gemini/examples/embeddings.ts
```

Examples of creating embeddings and calculating semantic similarity.

## Example Files

- **`basic-generation.ts`** - Simple text generation example
- **`streaming.ts`** - Streaming responses with tracking
- **`chat-session.ts`** - Multi-turn conversation with history
- **`embeddings.ts`** - Creating embeddings and semantic search

## What Gets Tracked

Each example automatically tracks:

- ✅ Input tokens (prompt token count)
- ✅ Output tokens (candidates token count)
- ✅ Cached content tokens
- ✅ Total tokens
- ✅ Model name
- ✅ Latency in milliseconds
- ✅ Whether the request was streamed
- ✅ Stream duration (for streaming requests)
- ✅ Finish reason (stop, max_tokens, safety, recitation)
- ✅ Errors and error messages

## Supported Models

All examples work with:

- `gemini-pro` - Text generation
- `gemini-pro-vision` - Multimodal (text + images)
- `gemini-1.5-pro` - Long context window
- `gemini-1.5-flash` - Fast responses
- `embedding-001` - Text embeddings

## Notes

- All examples use environment variables for API keys
- Debug mode is enabled to show detailed logging
- Examples are written in TypeScript and use the `tsx` runner
- Tracking failures never break your application
- Safety settings and content filters are automatically tracked

## Learn More

- [Package Documentation](../README.md)
- [Core SDK](../../sdk/README.md)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Get API Key](https://makersuite.google.com/app/apikey)
