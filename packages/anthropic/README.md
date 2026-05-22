# @fluxgate/anthropic

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)

Anthropic SDK wrapper for FluxGate token tracking. Automatically track token usage, costs, and latency for Anthropic Messages API calls.

## 📦 Installation

```bash
npm install @fluxgate/sdk @fluxgate/anthropic @anthropic-ai/sdk
```

## 🚀 Quick Start

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY,
});

const anthropic = createAnthropicCostTracker(client, fluxgate);

const message = await anthropic
  .withContext({
    feature: "chatbot",
    user: "user-123",
  })
  .messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello, Claude" }],
  });

console.log(message.content);
console.log(message.fluxGateCostTrackingResponse);
// {
//   status: "SUCCESS",
//   cost: 0.003,
//   trackingId: "evt_...",
//   createdAt: 1748000000000
// }
```

## 📖 API Reference

### `createAnthropicCostTracker(client, instance)`

Creates a tracked Anthropic client with context support.

**Parameters:**

- `client`: Anthropic client instance
- `instance`: `FluxGate` instance

**Returns:** Object with:

- `withContext(ctx: FluxGateContext)`: Returns tracked client with context
- `client`: Default tracked client (no context)

#### `FluxGateContext`

Fields available when calling `withContext()`:

| Field            | Type                                                         | Description                                                  |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `user`           | `string \| UserSession`                                      | End-user ID or UserSession object                            |
| `feature`        | `string`                                                     | Product feature name (e.g. `"chat"`, `"summarization"`)      |
| `step`           | `string`                                                     | Step within a feature pipeline                               |
| `sessionId`      | `string`                                                     | Session identifier                                           |
| `conversationId` | `string`                                                     | Conversation identifier                                      |
| `timestamp`      | `number`                                                     | Unix ms; defaults to server ingest time if omitted           |
| `serviceTier`    | `"default" \| "standard" \| "batch" \| "flex" \| "priority"` | Pricing tier multiplier                                      |
| `region`         | `string`                                                     | Hosting region for regional price variance                   |
| `openrouterCost` | `number`                                                     | Explicit cost in USD from a proxy; skips server-side compute |
| `cacheTtl`       | `string`                                                     | Provider cache expiration window (e.g. `"5m"`, `"1h"`)       |
| `costOverride`   | `CostOverride`                                               | Override per-token pricing for cost calculation              |
| `metadata`       | `Record<string, unknown>`                                    | Arbitrary key-value pairs forwarded to the event metadata    |

### Tracked Methods

- ✅ `messages.create()` — Messages API, non-streaming
- ✅ `messages.create({ stream: true })` — Messages API, streaming
- ✅ `completions.create()` — Legacy text completions, non-streaming and streaming
- ✅ `beta.messages.create()` — Beta Messages API, non-streaming and streaming

## 💡 Usage Examples

### Non-Streaming

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { FluxGate } from "@fluxgate/sdk";
import { createAnthropicCostTracker } from "@fluxgate/anthropic";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const fluxgate = new FluxGate({ apiKey: process.env.FLUXGATE_API_KEY });
const anthropic = createAnthropicCostTracker(client, fluxgate);

const message = await anthropic
  .withContext({ feature: "summarization", user: "user-123" })
  .messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: "Summarize the French Revolution in 3 sentences.",
      },
    ],
  });

console.log(message.content[0].text);
console.log(message.fluxGateCostTrackingResponse);
```

### Streaming

```typescript
const stream = await anthropic
  .withContext({ feature: "streaming-chat" })
  .messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Tell me a story" }],
    stream: true,
  });

for await (const event of stream) {
  if (
    event.type === "content_block_delta" &&
    event.delta.type === "text_delta"
  ) {
    process.stdout.write(event.delta.text);
  }
}

// Access tracking data after stream completes
console.log(stream.fluxGateCostTrackingResponse);
```

### Rich User Context

```typescript
const message = await anthropic
  .withContext({
    feature: "premium-chat",
    user: {
      id: "user-123",
      name: "Jane Smith",
      email: "jane@example.com",
      monthlyRevenue: 49.99,
    },
    sessionId: "sess-abc123",
    conversationId: "conv-xyz789",
  })
  .messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: "Hello!" }],
  });
```

### Error Handling

Errors are automatically tracked with `status: "ERROR"`:

```typescript
try {
  const message = await anthropic
    .withContext({ feature: "chat" })
    .messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello!" }],
    });
} catch (error) {
  // Error was tracked automatically with status: "ERROR"
  console.error(error);
}
```

### Without Context (Default)

```typescript
// Use client property for default tracking without metadata
const message = await anthropic.client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(message.fluxGateCostTrackingResponse);
```

## 📊 Tracking Data Structure

Each response includes a `fluxGateCostTrackingResponse` property:

```typescript
interface FluxGateCostTrackingResponse {
  status: AiEventStatus;
  cost: number | null;
  trackingId: string | null;
  createdAt: number | null;
  errorMessage?: string;
}

type AiEventStatus =
  | "SUCCESS"
  | "ERROR"
  | "BLOCKED"
  | "MAX_TOKENS"
  | "CONTENT_FILTER"
  | "RECITATION"
  | "MALFORMED_REQUEST";
```

Tracked metrics include:

- ✅ Input tokens (prompt)
- ✅ Output tokens (completion)
- ✅ Cache write tokens (prompt caching)
- ✅ Cache read tokens (prompt caching)
- ✅ Model name
- ✅ Latency (milliseconds)
- ✅ Stream duration (for streaming)
- ✅ Stop reason (end_turn, max_tokens, content_filter, etc.)

## 🎯 Type Safety

Full TypeScript support with enhanced types:

```typescript
import type {
  TrackedAnthropic,
  FluxGateContext,
  WithTracking,
  AiEventMetadata,
  UserSession,
  CostOverride,
  FluxGateCostTrackingResponse,
} from "@fluxgate/anthropic";

// TrackedAnthropic includes all Anthropic methods with tracking
const anthropic: TrackedAnthropic = trackedClient.client;

// WithTracking adds fluxGateCostTrackingResponse to any type
type Message = WithTracking<Anthropic.Message>;
```

## 🔗 Related Packages

- [@fluxgate/sdk](../sdk) - Core tracking library
- [@fluxgate/openai](../openai) - OpenAI SDK wrapper
- [@fluxgate/gemini](../gemini) - Gemini SDK wrapper

## 📝 License

MIT
