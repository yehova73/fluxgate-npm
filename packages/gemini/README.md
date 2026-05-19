# @fluxgate/gemini

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)

Google Gemini SDK wrapper for FluxGate token tracking. Automatically track token usage, costs, and latency for all Gemini API calls.

## 📦 Installation

```bash
npm install @fluxgate/sdk @fluxgate/gemini @google/genai
```

## 🚀 Quick Start

```typescript
import { GoogleGenAI } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize FluxGate tracker
const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY,
});

// Create tracked client
const gemini = createGeminiCostTracker(ai, fluxgate);

// Use with context
const result = await gemini
  .withContext({
    feature: "content-generation",
    user: "user-123",
  })
  .generateContent({
    model: "gemini-2.5-flash",
    contents: "Explain quantum computing in simple terms",
  });

// Access tracking data
console.log(result.text);
console.log(result.fluxGateCostTrackingResponse);
// {
//   status: "SUCCESS",
//   cost: 0.0002,
//   trackingId: "evt_...",
//   createdAt: "2026-05-05T..."
// }
```

## 📖 API Reference

### `createGeminiCostTracker(ai, instance)`

Creates a tracked Gemini client with context support.

**Parameters:**

- `ai`: `GoogleGenAI` instance from `@google/genai`
- `instance`: `FluxGate` instance

**Returns:** Object with:

- `withContext(ctx: FluxGateContext)`: Returns tracked client with context
- `client`: Default tracked client (no context)

#### `FluxGateContext`

Fields available when calling `withContext()`. The model is passed per-request, not here.

| Field            | Type                                                         | Description                                                  |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `user`           | `string \| TrackedUser`                                      | End-user ID or TrackedUser object                            |
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

All standard Gemini methods are supported with automatic tracking:

- ✅ `generateContent()` - Text generation
- ✅ `generateContentStream()` - Streaming generation
- ✅ `embedContent()` - Text embeddings
- ✅ `startChat()` - Multi-turn conversations

## 💡 Usage Examples

### Text Generation

```typescript
import { GoogleGenAI } from "@google/genai";
import { FluxGate } from "@fluxgate/sdk";
import { createGeminiCostTracker } from "@fluxgate/gemini";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const fluxgate = new FluxGate({ apiKey: process.env.FLUXGATE_API_KEY });
const gemini = createGeminiCostTracker(ai, fluxgate);

// Generate content
const result = await gemini
  .withContext({ feature: "content-gen", user: "user-123" })
  .generateContent({
    model: "gemini-2.5-flash",
    contents: "Write a poem about coding",
  });

console.log(result.text);
console.log(result.fluxGateCostTrackingResponse);
```

### Streaming Generation

```typescript
const stream = await gemini
  .withContext({ feature: "streaming-gen" })
  .generateContentStream({
    model: "gemini-2.5-flash",
    contents: "Tell me a long story about space exploration",
  });

// Stream the response
for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}

// Access tracking data after stream completes
console.log("\n\nTracking:", stream.fluxGateCostTrackingResponse);
```

### Chat Sessions

```typescript
const chat = gemini
  .withContext({ feature: "chatbot", user: "user-456" })
  .startChat({
    model: "gemini-2.5-flash",
    history: [
      {
        role: "user",
        parts: [{ text: "Hello! I'm learning about AI." }],
      },
      {
        role: "model",
        parts: [{ text: "That's great! I'd be happy to help you learn." }],
      },
    ],
  });

// Send messages
const result1 = await chat.sendMessage({
  message: "What is machine learning?",
});
console.log(result1.text);
console.log(result1.fluxGateCostTrackingResponse);

const result2 = await chat.sendMessage({
  message: "Can you give me an example?",
});
console.log(result2.text);
console.log(result2.fluxGateCostTrackingResponse);
```

### Streaming Chat

```typescript
const chat = gemini
  .withContext({ feature: "streaming-chat" })
  .startChat({ model: "gemini-2.5-flash" });

const stream = await chat.sendMessageStream({
  message: "Explain neural networks",
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}

console.log("\n\nTracking:", stream.fluxGateCostTrackingResponse);
```

### Updating Chat Session Context

Use `withTracking()` on a `TrackedChat` to change or extend context mid-conversation:

```typescript
const chat = gemini
  .withContext({ feature: "chatbot", user: "user-123" })
  .startChat({ model: "gemini-2.5-flash" });

// Upgrade context for a specific message (merged with existing context)
const premiumChat = chat.withTracking({
  feature: "premium-chatbot",
  user: {
    id: "user-123",
    name: "Jane Smith",
    monthlyRevenue: 49.99,
  },
});

const result = await premiumChat.sendMessage({
  message: "Help me with a complex task",
});
console.log(result.fluxGateCostTrackingResponse);
```

New context keys override matching keys from the original context; unmatched keys are preserved.

### Embeddings

```typescript
const result = await gemini
  .withContext({ feature: "embeddings" })
  .embedContent({
    model: "text-embedding-004",
    contents: "The quick brown fox jumps over the lazy dog",
  });

console.log(result.embeddings?.[0]?.values);
console.log(result.fluxGateCostTrackingResponse);
```

### Without Context (Default)

```typescript
// Use client property for default tracking without metadata
const result = await gemini.client.generateContent({
  model: "gemini-2.5-flash",
  contents: "Hello!",
});
console.log(result.fluxGateCostTrackingResponse);
```

### Rich User Context

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
  .generateContent({
    model: "gemini-2.5-flash",
    contents: "Create a marketing strategy",
  });

console.log(result.fluxGateCostTrackingResponse);
```

### Multiple Contexts

```typescript
const gemini = createGeminiCostTracker(ai, fluxgate);

// Create different contexts for different features
const contentClient = gemini.withContext({ feature: "content" });
const chatClient = gemini.withContext({ feature: "chat" });
const codeClient = gemini.withContext({ feature: "code-help" });

// Each maintains its own context
await contentClient.generateContent({
  model: "gemini-2.5-flash",
  contents: "Write an article",
});
await chatClient.startChat({ model: "gemini-2.5-flash" });
await codeClient.generateContent({
  model: "gemini-2.5-flash",
  contents: "Explain this code",
});
```

## 🔧 Advanced Usage

### Multimodal Generation (Vision)

```typescript
import fs from "fs";

const imageData = fs.readFileSync("./image.jpg");
const base64Image = imageData.toString("base64");

const result = await gemini
  .withContext({ feature: "image-analysis" })
  .generateContent({
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

### Error Tracking

Errors are automatically tracked:

```typescript
try {
  const result = await gemini
    .withContext({ feature: "content-gen" })
    .generateContent("Some prompt");
} catch (error) {
  // Error was tracked automatically with status: "ERROR"
  console.error(error);
}
```

### Safety Settings

```typescript
const result = await gemini
  .withContext({ feature: "safe-content" })
  .generateContent({
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

### Generation Config

```typescript
const result = await gemini
  .withContext({ feature: "creative-writing" })
  .generateContent({
    model: "gemini-2.5-flash",
    contents: "Write a creative story",
    config: {
      temperature: 0.9,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  });
```

## 📊 Tracking Data Structure

Each response includes a `fluxGateCostTrackingResponse` property:

```typescript
interface FluxGateCostTrackingResponse {
  status: AiEventStatus;
  cost: number | null;
  trackingId: string | null;
  createdAt: string | null;
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
- ✅ Total tokens
- ✅ Model name
- ✅ Latency (milliseconds)
- ✅ Stream duration (for streaming)
- ✅ Finish reason (stop, max_tokens, safety, recitation)
- ✅ Reasoning tokens (Gemini 2.5 thinking models)

## 🎯 Type Safety

Full TypeScript support with enhanced types:

```typescript
import type {
  TrackedGeminiClient,
  TrackedChat,
  FluxGateContext,
  WithTracking,
  AiEventMetadata,
  TrackedUser,
  CostOverride,
  FluxGateCostTrackingResponse,
} from "@fluxgate/gemini";

// TrackedGeminiClient includes all Gemini methods with tracking
const client: TrackedGeminiClient = gemini.client;

// WithTracking adds fluxGateCostTrackingResponse to any type
type Response = WithTracking<GenerateContentResponse>;
```

## 🔗 Related Packages

- [@fluxgate/sdk](../sdk) - Core tracking library
- [@fluxgate/openai](../openai) - OpenAI SDK wrapper

## 📖 Examples

See the [examples directory](./examples) for complete working examples:

- Basic text generation
- Streaming responses
- Chat sessions
- Embeddings

## 🚀 Supported Models

All Google Gemini models are supported:

- `gemini-2.5-pro` - Most capable model
- `gemini-2.5-flash` - Fast, efficient responses
- `gemini-1.5-pro` - Long context window
- `gemini-1.5-flash` - Stable fast responses
- `text-embedding-004` - Text embeddings

## 📝 License

MIT
