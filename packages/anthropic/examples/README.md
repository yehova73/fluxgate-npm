# Anthropic Examples

This directory contains example code demonstrating various features of the @fluxgate/anthropic package.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Anthropic API key
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
   export ANTHROPIC_API_KEY="your-anthropic-api-key"
   export FLUXGATE_API_KEY="your-fluxgate-api-key"
   ```

## Examples

### Basic Chat (`basic-chat.ts`)

Demonstrates a simple non-streaming message with FluxGate cost tracking context.

```bash
npx tsx examples/basic-chat.ts
```

### Streaming (`streaming.ts`)

Shows how to use streaming responses with `stream: true` and access tracking data after the stream completes.

```bash
npx tsx examples/streaming.ts
```

### Multiple Contexts (`multiple-contexts.ts`)

Illustrates how to use `withContext` to track costs across different features and users in the same application, as well as using the default `client` accessor without a context.

```bash
npx tsx examples/multiple-contexts.ts
```

### Error Handling (`error-handling.ts`)

Demonstrates that failed requests are still tracked by FluxGate and shows best practices for handling errors in both regular and streaming calls.

```bash
npx tsx examples/error-handling.ts
```
