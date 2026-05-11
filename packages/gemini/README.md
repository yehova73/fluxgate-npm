# @llmwatch/tokentracker-gemini

Google Gemini SDK wrapper for LLMWatch token tracking. Automatically track token usage, costs, and latency for all Gemini API calls.

## 📦 Installation

```bash
npm install @llmwatch/tokentracker @llmwatch/tokentracker-gemini @google/generative-ai
```

## 🚀 Quick Start

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Tracker } from "@llmwatch/tokentracker";
import { createGeminiTokenTracker } from "@llmwatch/tokentracker-gemini";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Initialize LLMWatch tracker
const tracker = new Tracker({
  apiKey: process.env.LLMWATCH_API_KEY,
});

// Create tracked model
const gemini = createGeminiTokenTracker(model, tracker);

// Use with context
const result = await gemini
  .withContext({
    feature: "content-generation",
    user: "user-123",
  })
  .generateContent("Explain quantum computing in simple terms");

// Access tracking data
console.log(result.response.text());
console.log(result.trackLlmResponse);
// {
//   status: "SUCCESS",
//   cost: 0.0002,
//   trackingId: "evt_...",
//   createdAt: "2026-05-05T..."
// }
```

## 📖 API Reference

### `createGeminiTokenTracker(model, tracker)`

Creates a tracked Gemini model with context support.

**Parameters:**

- `model`: GenerativeModel instance
- `tracker`: LLMWatch Tracker instance

**Returns:** Object with:

- `withContext(metadata)`: Returns tracked model with context
- `model`: Default tracked model (no context)

### Tracked Methods

All standard Gemini methods are supported with automatic tracking:

- ✅ `generateContent()` - Text generation
- ✅ `generateContentStream()` - Streaming generation
- ✅ `embedContent()` - Text embeddings
- ✅ `startChat()` - Multi-turn conversations

## 💡 Usage Examples

### Text Generation

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Tracker } from "@llmwatch/tokentracker";
import { createGeminiTokenTracker } from "@llmwatch/tokentracker-gemini";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const tracker = new Tracker({ apiKey: process.env.LLMWATCH_API_KEY });
const gemini = createGeminiTokenTracker(model, tracker);

// Generate content
const result = await gemini
  .withContext({ feature: "content-gen", user: "user-123" })
  .generateContent("Write a poem about coding");

console.log(result.response.text());
console.log(result.trackLlmResponse);
```

### Streaming Generation

```typescript
const result = await gemini
  .withContext({ feature: "streaming-gen" })
  .generateContentStream("Tell me a long story about space exploration");

// Stream the response
for await (const chunk of result.stream) {
  const chunkText = chunk.text();
  process.stdout.write(chunkText);
}

// Access tracking data after stream completes
const response = await result.response;
console.log("\n\nTracking:", result.trackLlmResponse);
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
const result1 = await chat.sendMessage("What is machine learning?");
console.log(result1.response.text());
console.log(result1.trackLlmResponse);

const result2 = await chat.sendMessage("Can you give me an example?");
console.log(result2.response.text());
console.log(result2.trackLlmResponse);
```

### Streaming Chat

```typescript
const chat = gemini.withContext({ feature: "streaming-chat" }).startChat();

const result = await chat.sendMessageStream("Explain neural networks");

for await (const chunk of result.stream) {
  process.stdout.write(chunk.text());
}

const response = await result.response;
console.log("\n\nTracking:", result.trackLlmResponse);
```

### Embeddings

```typescript
const result = await gemini
  .withContext({ feature: "embeddings" })
  .embedContent("The quick brown fox jumps over the lazy dog");

console.log(result.embedding.values);
console.log(result.trackLlmResponse);
```

### Without Context (Default)

```typescript
// Use model property for default tracking without metadata
const result = await gemini.model.generateContent("Hello!");
console.log(result.trackLlmResponse);
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

console.log(result.trackLlmResponse);
```

### Multiple Contexts

```typescript
const gemini = createGeminiTokenTracker(model, tracker);

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
const gemini = createGeminiTokenTracker(model, tracker);

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
console.log(result.trackLlmResponse);
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

const gemini = createGeminiTokenTracker(model, tracker);

const result = await gemini
  .withContext({ feature: "safe-content" })
  .generateContent("Your prompt");

// If blocked by safety settings, status will be "BLOCKED"
console.log(result.trackLlmResponse);
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

const gemini = createGeminiTokenTracker(model, tracker);

const result = await gemini
  .withContext({ feature: "creative-writing" })
  .generateContent("Write a creative story");
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
  TrackLlmResponse,
} from "@llmwatch/tokentracker-gemini";

// TrackedGenerativeModel includes all Gemini methods with tracking
const model: TrackedGenerativeModel = gemini.model;

// WithTracking adds trackLlmResponse to any type
type Response = WithTracking<GenerateContentResult>;
```

## 🔗 Related Packages

- [@llmwatch/tokentracker](../tokentracker) - Core tracking library
- [@llmwatch/tokentracker-openai](../tokentracker-openai) - OpenAI SDK wrapper

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
