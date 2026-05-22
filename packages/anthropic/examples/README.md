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
npx tsx packages/anthropic/examples/basic-chat.ts
```

### Streaming (`streaming.ts`)

Shows how to use streaming responses with `stream: true` and access tracking data after the stream completes.

```bash
npx tsx packages/anthropic/examples/streaming.ts
```

### Multiple Contexts (`multiple-contexts.ts`)

Illustrates how to use `withContext` to track costs across different features and users in the same application, as well as using the default `client` accessor without a context.

```bash
npx tsx packages/anthropic/examples/multiple-contexts.ts
```

### Error Handling (`error-handling.ts`)

Demonstrates that failed requests are still tracked by FluxGate and shows best practices for handling errors in both regular and streaming calls.

```bash
npx tsx packages/anthropic/examples/error-handling.ts
```

### Tool Use (`tool-use.ts`)

Shows Claude's tool-calling capability: define tools, handle a `tool_use` stop reason, execute the tool locally, send the result back, and get a final text response. Also demonstrates forced tool choice.

```bash
npx tsx packages/anthropic/examples/tool-use.ts
```

### Vision / Multimodal (`vision.ts`)

Sends image content to Claude via URL or base64, including mixed text+image turns.

```bash
npx tsx packages/anthropic/examples/vision.ts
```

### Prompt Caching (`prompt-caching.ts`)

Adds `cache_control: { type: "ephemeral" }` to system prompt and message blocks so Anthropic caches them server-side. FluxGate auto-detects the `cache_control` blocks and records the `cacheTtl` in event metadata — no extra configuration needed.

```bash
npx tsx packages/anthropic/examples/prompt-caching.ts
```

### Extended Thinking (`extended-thinking.ts`)

Uses `client.beta.messages.create` with `thinking: { type: "enabled", budget_tokens: N }` and the `interleaved-thinking-2025-05-14` beta header. Shows both non-streaming and streaming thinking responses.

```bash
npx tsx packages/anthropic/examples/extended-thinking.ts
```

### Multi-turn Conversations (`conversations.ts`)

Builds up a message history across multiple turns, binding `conversationId` and `sessionId` in the context. Also demonstrates `messages.withTracking({ step: "..." })` to tag individual turns without mutating the session context.

```bash
npx tsx packages/anthropic/examples/conversations.ts
```
