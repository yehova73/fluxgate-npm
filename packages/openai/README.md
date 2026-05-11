# @fluxgate/openai

OpenAI SDK wrapper for FluxGate token tracking. Automatically track token usage, costs, and latency for all OpenAI API calls.

## 📦 Installation

```bash
npm install @fluxgate/sdk @fluxgate/openai openai
```

## 🚀 Quick Start

```typescript
import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize FluxGate tracker
const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY,
});

// Create tracked client
const openai = createOpenAICostTracker(client, fluxgate);

// Use with context
const response = await openai
  .withContext({
    feature: "chatbot",
    user: "user-123",
  })
  .chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
  });

// Access tracking data
console.log(response.trackLlmResponse);
// {
//   status: "SUCCESS",
//   cost: 0.0015,
//   trackingId: "evt_...",
//   createdAt: "2026-05-05T..."
// }
```

## 📖 API Reference

### `createOpenAICostTracker(client, tracker)`

Creates a tracked OpenAI client with context support.

**Parameters:**

- `client`: OpenAI client instance
- `fluxgate`: FluxGate instance

**Returns:** Object with:

- `withContext(metadata)`: Returns tracked client with context
- `client`: Default tracked client (no context)

### Tracked Methods

All standard OpenAI methods are supported with automatic tracking:

- ✅ `chat.completions.create()` - Chat completions
- ✅ `completions.create()` - Legacy completions
- ✅ `responses.create()` - Responses API
- ✅ `embeddings.create()` - Embeddings
- ✅ Streaming responses (all methods)

## 💡 Usage Examples

### Chat Completions

```typescript
import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fluxgate = new FluxGate({ apiKey: process.env.FLUXGATE_API_KEY });
const openai = createOpenAICostTracker(client, fluxgate);

// Non-streaming
const completion = await openai
  .withContext({ feature: "chat", user: "user-123" })
  .chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is TypeScript?" },
    ],
  });

console.log(completion.choices[0].message.content);
console.log(completion.trackLlmResponse);
```

### Streaming Responses

```typescript
const stream = await openai
  .withContext({ feature: "streaming-chat" })
  .chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Tell me a story" }],
    stream: true,
  });

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || "");
}

// Access tracking data after stream completes
console.log(stream.trackLlmResponse);
```

### Embeddings

```typescript
const embedding = await openai
  .withContext({ feature: "semantic-search" })
  .embeddings.create({
    model: "text-embedding-ada-002",
    input: "The quick brown fox jumps over the lazy dog",
  });

console.log(embedding.data[0].embedding);
console.log(embedding.trackLlmResponse);
```

### Completions (Legacy)

```typescript
const completion = await openai
  .withContext({ feature: "text-gen" })
  .completions.create({
    model: "gpt-3.5-turbo-instruct",
    prompt: "Write a tagline for an ice cream shop",
    max_tokens: 50,
  });

console.log(completion.choices[0].text);
console.log(completion.trackLlmResponse);
```

### Responses API

```typescript
const response = await openai
  .withContext({ feature: "reasoning" })
  .responses.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Explain quantum computing" }],
  });

console.log(response.output);
console.log(response.trackLlmResponse);
```

### Without Context (Default)

```typescript
// Use client property for default tracking without metadata
const completion = await openai.client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### Rich User Context

```typescript
const completion = await openai
  .withContext({
    feature: "premium-chat",
    user: {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      monthlyRevenue: 99.99,
    },
    sessionId: "sess-abc123",
    conversationId: "conv-xyz789",
    customField: "any additional data",
  })
  .chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
  });
```

### Multiple Contexts

```typescript
const openai = createOpenAICostTracker(client, tracker);

// Create different contexts for different features
const chatClient = openai.withContext({ feature: "chat" });
const summaryClient = openai.withContext({ feature: "summary" });
const codeClient = openai.withContext({ feature: "code-gen" });

// Each maintains its own context
await chatClient.chat.completions.create({...});
await summaryClient.chat.completions.create({...});
await codeClient.chat.completions.create({...});
```

## 🔧 Advanced Usage

### Error Tracking

Errors are automatically tracked:

```typescript
try {
  const completion = await openai
    .withContext({ feature: "chat" })
    .chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello!" }],
    });
} catch (error) {
  // Error was tracked automatically with status: "ERROR"
  console.error(error);
}
```

### Stream Error Handling

```typescript
const stream = await openai
  .withContext({ feature: "streaming" })
  .chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: "Hello!" }],
    stream: true,
  });

try {
  for await (const chunk of stream) {
    console.log(chunk.choices[0]?.delta?.content);
  }
} catch (error) {
  console.error("Stream error:", error);
}

// Tracking data includes error information
console.log(stream.trackLlmResponse);
// { status: "ERROR", errorMessage: "...", ... }
```

### Accessing the TrackedStream

```typescript
import { TrackedStream } from "@fluxgate/openai";

const stream = await openai.client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
  stream: true,
});

// TrackedStream implements AsyncIterable
if (stream instanceof TrackedStream) {
  for await (const chunk of stream) {
    // Process chunks
  }

  // Access tracking after completion
  const tracking = stream.trackLlmResponse;
}
```

## 📊 Tracking Data Structure

Each response includes a `trackLlmResponse` property:

```typescript
interface TrackLlmResponse {
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
- ✅ Output tokens (completion)
- ✅ Cached tokens (prompt caching)
- ✅ Total tokens
- ✅ Model name
- ✅ Latency (milliseconds)
- ✅ Stream duration (for streaming)
- ✅ Finish reason (stop, length, content_filter, etc.)

## 🎯 Type Safety

Full TypeScript support with enhanced types:

```typescript
import type {
  TrackedOpenAI,
  WithTracking,
  AiEventMetadata,
  TrackedUser,
  TrackLlmResponse,
} from "@fluxgate/openai";

// TrackedOpenAI includes all OpenAI methods with tracking
const openai: TrackedOpenAI = trackedClient.client;

// WithTracking adds trackLlmResponse to any type
type Response = WithTracking<OpenAI.Chat.Completions.ChatCompletion>;
```

## 🔗 Related Packages

- [@fluxgate/sdk](../sdk) - Core tracking library
- [@fluxgate/gemini](../gemini) - Gemini SDK wrapper

## 📖 Examples

See the [examples directory](./examples) for complete working examples:

- Basic chat completions
- Streaming responses
- Error handling
- Multiple contexts

## 📝 License

MIT
