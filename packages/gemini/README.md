# @fluxgate/gemini

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)

Google Gemini SDK wrapper for [FluxGate](https://fluxgate.app) - automatically tracks token usage, costs, and latency for all Gemini API calls.

## Installation

```bash
npm install @fluxgate/gemini
```

> **ESM only** - this package ships as ESM (`"type": "module"`), matching `@google/genai` v2+.
> Your project must use ESM. Node.js ≥ 18 is required.

> **Peer dependency** - `@google/genai` is a peer dependency; it is assumed you already have it installed. `@fluxgate/sdk` is pulled in automatically as a dependency.

Get your FluxGate API key at [fluxgate.app](https://fluxgate.app).

## Quick Start

```typescript
import { GoogleGenAI } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const fluxgate = new FluxGate({ apiKey: process.env.FLUXGATE_API_KEY });
const gemini = createGeminiCostTracker(ai, fluxgate);

const result = await gemini
  .withContext({ feature: "content-generation", user: "user-123" })
  .models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain quantum computing in simple terms",
  });

console.log(result.text);
console.log(result.fluxGateCostTrackingResponse);
// { status: "SUCCESS", cost: 0.0002, trackingId: "evt_...", createdAt: 1748000000000 }
```

## API Reference

### `createGeminiCostTracker(ai, instance)`

Creates a tracked Gemini client with context support.

**Parameters:**

- `ai` - `GoogleGenAI` instance from `@google/genai`
- `instance` - `FluxGate` instance

**Returns:**

- `withContext(ctx: FluxGateContext)` - returns a tracked client bound to the given context
- `client` - tracked client with no context

---

### `FluxGateContext`

All fields are optional. Pass to `withContext()` to annotate tracked events.

| Field            | Type                      | Description                                               |
| ---------------- | ------------------------- | --------------------------------------------------------- |
| `user`           | `string \| UserSession`   | End-user ID or a `UserSession` object (see below)         |
| `feature`        | `string`                  | Product feature name (e.g. `"chat"`, `"summarization"`)   |
| `step`           | `string`                  | Step within a feature pipeline                            |
| `sessionId`      | `string`                  | Session identifier                                        |
| `conversationId` | `string`                  | Conversation identifier                                   |
| `costOverride`   | `GeminiCostOverride`      | Override per-token pricing for cost calculation           |
| `metadata`       | `Record<string, unknown>` | Arbitrary key-value pairs forwarded to the event metadata |

---

### `UserSession`

Pass a `UserSession` object to the `user` field to associate identity and revenue data with every event.

| Field            | Type                       | Description                           |
| ---------------- | -------------------------- | ------------------------------------- |
| `id`             | `string`                   | Required. Your internal user ID       |
| `name`           | `string \| null`           | Display name                          |
| `email`          | `string \| null`           | Email address                         |
| `image`          | `string \| null`           | Avatar URL                            |
| `monthlyRevenue` | `number \| string \| null` | Monthly revenue in USD (e.g. `49.99`) |

```typescript
await gemini
  .withContext({
    feature: "chat",
    user: { id: "user-123", name: "Alice", email: "alice@example.com", monthlyRevenue: 49.99 },
  })
  .models.generateContent({ ... });
```

---

### `GeminiCostOverride`

Supply custom per-token rates when FluxGate does not have pricing for a model. All rates are **per 1 million tokens**.

| Field                      | Type             | Description                                           |
| -------------------------- | ---------------- | ----------------------------------------------------- |
| `inputCostPer1MTokens`     | `number`         | Required. Cost per 1M prompt/input tokens in USD      |
| `outputCostPer1MTokens`    | `number`         | Required. Cost per 1M completion/output tokens in USD |
| `cacheReadCostPer1MTokens` | `number \| null` | Cost per 1M tokens read from prompt cache             |
| `thinkingCostPer1MTokens`  | `number \| null` | Cost per 1M thinking tokens (Gemini 2.5 models)       |

---

### Tracked Methods

Every call returns the standard Gemini SDK response intersected with `fluxGateCostTrackingResponse`.

- `models.generateContent()` - text generation
- `models.generateContentStream()` - streaming generation
- `models.embedContent()` - text embeddings
- `chats.create()` - multi-turn chat sessions (`sendMessage`, `sendMessageStream`, `getHistory`, `withTracking`)

#### `fluxGateCostTrackingResponse`

| Field          | Type             | Description                                        |
| -------------- | ---------------- | -------------------------------------------------- |
| `status`       | `AiEventStatus`  | Outcome of the request (see values below)          |
| `cost`         | `number \| null` | Total cost in USD; `null` if model pricing unknown |
| `trackingId`   | `string \| null` | FluxGate event ID                                  |
| `createdAt`    | `number \| null` | Unix timestamp (ms) from the FluxGate server       |
| `errorMessage` | `string`         | Error message when `status` is `"ERROR"`           |

**`AiEventStatus` values:**

| Value               | When it occurs                                         |
| ------------------- | ------------------------------------------------------ |
| `SUCCESS`           | Request completed normally                             |
| `ERROR`             | Request or stream threw an exception                   |
| `BLOCKED`           | Response stopped by a safety filter                    |
| `MAX_TOKENS`        | Generation stopped because the token limit was reached |
| `CONTENT_FILTER`    | Provider flagged content mid-generation                |
| `RECITATION`        | Response stopped due to recitation from training data  |
| `MALFORMED_REQUEST` | Request was rejected before inference                  |

> **Streaming:** `fluxGateCostTrackingResponse` is populated only after the stream is fully consumed (i.e. after the `for await` loop completes or throws). Accessing it before that returns `undefined`.

---

## Usage Examples

### Text Generation

```typescript
const result = await gemini
  .withContext({ feature: "content-generation", user: "user-123" })
  .models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain quantum computing in simple terms",
  });

console.log(result.text);
console.log(result.fluxGateCostTrackingResponse);
// { status: "SUCCESS", cost: 0.0002, trackingId: "evt_...", createdAt: 1748000000000 }
```

### Streaming Generation

<details>
<summary>Click to view streaming generation example</summary>

Use `config.serviceTier` to control capacity and cost. The tier is captured automatically by the wrapper and applied to cost calculations.

```typescript
// Priority tier - lowest latency, premium capacity
const priorityStream = await gemini
  .withContext({ feature: "realtime-assistant", user: "user-123" })
  .models.generateContentStream({
    model: "gemini-2.5-flash",
    config: { serviceTier: "priority" },
    contents: "Tell me a long story about space exploration",
  });

for await (const chunk of priorityStream) {
  process.stdout.write(chunk.text ?? "");
}
console.log("\nTracking:", priorityStream.fluxGateCostTrackingResponse);

// Flex tier - cost-optimised, best-effort scheduling
const flexStream = await gemini
  .withContext({ feature: "batch-summarisation" })
  .models.generateContentStream({
    model: "gemini-2.5-flash",
    config: { serviceTier: "flex" },
    contents: "Summarise the history of computing",
  });

for await (const chunk of flexStream) {
  process.stdout.write(chunk.text ?? "");
}
console.log("\nTracking:", flexStream.fluxGateCostTrackingResponse);
```

</details>

### Chat Sessions

<details>
<summary>Click to view multi-turn chat example</summary>

```typescript
const chat = gemini
  .withContext({ feature: "chatbot", user: "user-456" })
  .chats.create({
    model: "gemini-2.5-flash",
    history: [
      { role: "user", parts: [{ text: "Hello! I'm learning about AI." }] },
      {
        role: "model",
        parts: [{ text: "That's great! I'd be happy to help." }],
      },
    ],
  });

const result1 = await chat.sendMessage({
  message: "What is machine learning?",
});
console.log(result1.text);
console.log(result1.fluxGateCostTrackingResponse);

// Fork context to tag the follow-up step
const result2 = await chat.withTracking({ step: "follow-up" }).sendMessage({
  message: "Can you give me an example?",
});
console.log(result2.text);
console.log(result2.fluxGateCostTrackingResponse);
```

</details>

### Streaming Chat

<details>
<summary>Click to view streaming chat example</summary>

```typescript
const chat = gemini
  .withContext({ feature: "streaming-chat" })
  .chats.create({ model: "gemini-2.5-flash" });

const stream = await chat.sendMessageStream({
  message: "Explain neural networks",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}
console.log("\nTracking:", stream.fluxGateCostTrackingResponse);
```

</details>

### Updating Chat Session Context

Use `withTracking()` on a `TrackedChat` to change or extend context mid-conversation.

> **Fork, not mutation** - `withTracking()` returns a new `TrackedChat` that shares the same underlying session history as the original, but uses the merged context for tracking. The original `chat` object is unaffected; messages sent through it continue to use the original context.

<details>
<summary>Click to view context update example</summary>

```typescript
const chat = gemini
  .withContext({ feature: "support-chat", user: "user-456", step: "initial" })
  .chats.create({ model: "gemini-2.5-flash" });

// First turn uses base context
const reply1 = await chat.sendMessage({
  message: "My order hasn't arrived yet.",
});
console.log(reply1.text);

// Fork to tag the escalation step — original `chat` keeps its context
const escalated = chat.withTracking({ step: "escalation" });
const reply2 = await escalated.sendMessage({
  message: "I've waited two weeks. I need this resolved urgently.",
});
console.log(reply2.text);
console.log(reply2.fluxGateCostTrackingResponse);
// { status: "SUCCESS", cost: 0.00004, trackingId: "evt_...", createdAt: 1748000000000 }
```

</details>

New context keys override matching keys from the original context; unmatched keys are preserved.

### Embeddings

<details>
<summary>Click to view embeddings example</summary>

```typescript
const result = await gemini
  .withContext({ feature: "embeddings" })
  .models.embedContent({
    model: "text-embedding-004",
    contents: "The quick brown fox jumps over the lazy dog",
  });

console.log(result.embeddings?.[0]?.values);
console.log(result.fluxGateCostTrackingResponse);
```

</details>

### Without Context (Default)

<details>
<summary>Click to view no-context example</summary>

```typescript
// Use client property for default tracking without metadata
const result = await gemini.client.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Hello!",
});
console.log(result.fluxGateCostTrackingResponse);
```

</details>

### Rich User Context

<details>
<summary>Click to view rich context example</summary>

```typescript
const result = await gemini
  .withContext({
    feature: "premium-content-gen",
    user: {
      id: "user-123",
      name: "Jane Smith",
      email: "jane@example.com",
      monthlyRevenue: 49.99,
    },
    sessionId: "sess-abc123",
    conversationId: "conv-xyz789",
    metadata: { tier: "premium" },
  })
  .models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Create a marketing strategy",
  });

console.log(result.fluxGateCostTrackingResponse);
```

</details>

### Multiple Contexts

<details>
<summary>Click to view multiple-contexts example</summary>

```typescript
const contentClient = gemini.withContext({ feature: "content" });
const chatClient = gemini.withContext({ feature: "chat" });
const codeClient = gemini.withContext({ feature: "code-help" });

await contentClient.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Write an article",
});
chatClient.chats.create({ model: "gemini-2.5-flash" });
await codeClient.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Explain this code",
});
```

</details>

## Advanced Usage

### Multimodal Generation (Vision)

<details>
<summary>Click to view multimodal generation example</summary>

```typescript
import fs from "fs";

const base64Image = fs.readFileSync("./image.jpg").toString("base64");

const result = await gemini
  .withContext({ feature: "image-analysis" })
  .models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Describe this image in detail" },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
        ],
      },
    ],
  });

console.log(result.text);
console.log(result.fluxGateCostTrackingResponse);
```

</details>

### Error Tracking

Errors are automatically tracked with `status: "ERROR"` before being re-thrown:

<details>
<summary>Click to view error tracking example</summary>

```typescript
try {
  const result = await gemini
    .withContext({ feature: "content-gen" })
    .models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Some prompt",
    });
} catch (error) {
  // Error was tracked automatically with status: "ERROR"
  console.error(error);
}
```

</details>

### Safety Settings

<details>
<summary>Click to view safety settings example</summary>

```typescript
const result = await gemini
  .withContext({ feature: "safe-content" })
  .models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Your prompt",
    config: {
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    },
  });

// If blocked by safety settings, status will be "BLOCKED"
console.log(result.fluxGateCostTrackingResponse);
```

</details>

### Generation Config

<details>
<summary>Click to view generation config example</summary>

```typescript
const result = await gemini
  .withContext({ feature: "creative-writing" })
  .models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Write a creative story",
    config: { temperature: 0.9, topK: 40, topP: 0.95, maxOutputTokens: 1024 },
  });
```

</details>

## Tracking Data Structure

Each response includes a `fluxGateCostTrackingResponse` property:

```typescript
interface FluxGateCostTrackingResponse {
  status: AiEventStatus;
  cost: number | null;
  trackingId: string | null;
  createdAt: number | null; // Unix timestamp (ms) from the FluxGate server
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
- ✅ Output tokens (candidates)
- ✅ Cached content tokens
- ✅ Thinking tokens (Gemini 2.5 models)
- ✅ Model name
- ✅ Latency (milliseconds)
- ✅ Stream duration (for streaming)
- ✅ Finish reason (stop, max_tokens, safety, recitation)
- ✅ Service tier (from `request.config.serviceTier`)

## Type Safety

Full TypeScript support with enhanced types:

```typescript
import type {
  TrackedGeminiClient,
  TrackedChat,
  FluxGateContext,
  WithTracking,
  AiEventMetadata,
  UserSession,
  GeminiCostOverride,
  GeminiAiEventUsage,
  FluxGateCostTrackingResponse,
} from "@fluxgate/gemini";

// TrackedGeminiClient includes all Gemini methods with tracking
const client: TrackedGeminiClient = gemini.client;

// WithTracking adds fluxGateCostTrackingResponse to any type
type Response = WithTracking<GenerateContentResponse>;
```

## Related Packages

- [@fluxgate/sdk](../sdk) - Core tracking library
- [@fluxgate/openai](../openai) - OpenAI SDK wrapper
- [@fluxgate/anthropic](../anthropic) - Anthropic SDK wrapper

## Examples

Full runnable examples are available in the [examples directory](./examples):

- [`basic-generation.ts`](./examples/basic-generation.ts) - `models.generateContent` with tracking
- [`streaming.ts`](./examples/streaming.ts) - `models.generateContentStream`, chunk iteration
- [`chat-session.ts`](./examples/chat-session.ts) - multi-turn chat with `chats.create` and `sendMessage`
- [`embeddings.ts`](./examples/embeddings.ts) - `models.embedContent`, single and batch
- [`function-calling.ts`](./examples/function-calling.ts) - manual function calling round-trip
- [`multimodal.ts`](./examples/multimodal.ts) - inline image analysis and vision chat
- [`structured-output.ts`](./examples/structured-output.ts) - system instructions and JSON schema responses
- [`error-handling.ts`](./examples/error-handling.ts) - API error inspection and automatic error tracking
- [`full-example.ts`](./examples/full-example.ts) - all tracked methods in a single file

## License

MIT
