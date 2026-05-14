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

// Create tracked client (pass ai instance + model name)
const gemini = createGeminiCostTracker(ai, "gemini-2.5-flash", fluxgate);

// Use with context
const result = await gemini
  .withContext({
    feature: "content-generation",
    user: "user-123",
  })
  .generateContent({ contents: "Explain quantum computing in simple terms" });

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

### `createGeminiCostTracker(ai, modelName, fluxgate)`

Creates a tracked Gemini client with context support.

**Parameters:**

- `ai`: `GoogleGenAI` instance from `@google/genai`
- `modelName`: Model name string (e.g. `"gemini-2.5-flash"`)
- `fluxgate`: `FluxGate` instance

**Returns:** Object with:

- `withContext(metadata)`: Returns tracked client with context
- `client`: Default tracked client (no context)

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
const gemini = createGeminiCostTracker(ai, "gemini-2.5-flash", fluxgate);

// Generate content
const result = await gemini
  .withContext({ feature: "content-gen", user: "user-123" })
  .generateContent({ contents: "Write a poem about coding" });

console.log(result.text);
console.log(result.fluxGateCostTrackingResponse);
```

### Streaming Generation

```typescript
const stream = await gemini
  .withContext({ feature: "streaming-gen" })
  .generateContentStream({
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
const chat = gemini.withContext({ feature: "streaming-chat" }).startChat();

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
  .startChat();

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
  .embedContent({ contents: "The quick brown fox jumps over the lazy dog" });

console.log(result.embeddings?.[0]?.values);
console.log(result.fluxGateCostTrackingResponse);
```

### Without Context (Default)

```typescript
// Use client property for default tracking without metadata
const result = await gemini.client.generateContent({ contents: "Hello!" });
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
    customTier: "premium",
  })
  .generateContent("Create a marketing strategy");

console.log(result.fluxGateCostTrackingResponse);
```

### Multiple Contexts

```typescript
const gemini = createGeminiCostTracker(model, fluxgate);

// Create different contexts for different features
const contentModel = gemini.withContext({ feature: "content" });
const chatModel = gemini.withContext({ feature: "chat" });
const codeModel = gemini.withContext({ feature: "code-help" });

// Each maintains its own context
await contentModel.generateContent("Write an article");
await chatModel.startChat();
await codeModel.generateContent("Explain this code");
```

## 🔧 Advanced Usage

### Multimodal Generation (Vision)

```typescript
import fs from "fs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
const gemini = createGeminiCostTracker(model, fluxgate);

const imageData = fs.readFileSync("./image.jpg");
const base64Image = imageData.toString("base64");

const result = await gemini
  .withContext({ feature: "image-analysis" })
  .generateContent([
    { text: "Describe this image in detail" },
    {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Image,
      },
    },
  ]);

console.log(result.response.text());
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
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-pro",
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ],
});

const gemini = createGeminiCostTracker(model, tracker);

const result = await gemini
  .withContext({ feature: "safe-content" })
  .generateContent("Your prompt");

// If blocked by safety settings, status will be "BLOCKED"
console.log(result.fluxGateCostTrackingResponse);
```

### Generation Config

```typescript
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-pro",
  generationConfig: {
    temperature: 0.9,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  },
});

const gemini = createGeminiCostTracker(model, tracker);

const result = await gemini
  .withContext({ feature: "creative-writing" })
  .generateContent("Write a creative story");
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

## 🎯 Type Safety

Full TypeScript support with enhanced types:

```typescript
import type {
  TrackedGenerativeModel,
  TrackedChatSession,
  WithTracking,
  AiEventMetadata,
  TrackedUser,
  FluxGateCostTrackingResponse,
} from "@fluxgate/gemini";

// TrackedGenerativeModel includes all Gemini methods with tracking
const model: TrackedGenerativeModel = gemini.model;

// WithTracking adds fluxGateCostTrackingResponse to any type
type Response = WithTracking<GenerateContentResult>;
```

## 🔗 Related Packages

- [@fluxgate/sdk](../sdk) - Core tracking library
- [@fluxgate/openai](../openai) - OpenAI SDK wrapper

## 📖 Examples

See the [examples directory](./examples) for complete working examples:

- Basic text generation
- Streaming responses
- Chat sessions
- Multimodal (vision) usage
- Error handling

## 🚀 Supported Models

All Google Gemini models are supported:

- `gemini-pro` - Text generation
- `gemini-pro-vision` - Multimodal (text + images)
- `gemini-ultra` - Most capable model
- `gemini-1.5-pro` - Long context window
- `gemini-1.5-flash` - Fast responses

## 📝 License

MIT
