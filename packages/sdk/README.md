# @fluxgate/sdk

Core tracking functionality for FluxGate. This package provides the base `FluxGate` class that sends usage data to the FluxGate API.

## 📦 Installation

```bash
npm install @fluxgate/sdk
```

## 🚀 Quick Start

```typescript
import { FluxGate } from "@fluxgate/sdk";

const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY,
  endpoint: "https://fluxgate.app/api/events", // optional
  timeout: 5000, // optional, default: 5000ms
  debug: false, // optional, default: false
});

// Record a usage event
const response = await fluxgate.recordEvent({
  usage: {
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 20,
    model: "gpt-4",
    provider: "openai",
    latencyInMs: 1500,
    isStreamed: false,
  },
  status: "SUCCESS",
  metadata: {
    feature: "chatbot",
    user: "user-123",
    sessionId: "session-456",
  },
});

console.log(response);
// { id: "event-123", createdAt: "2026-05-05T...", cost: 0.001 }
```

## 📖 API Reference

### `FluxGate`

The main class for tracking LLM usage events.

#### Constructor

```typescript
new FluxGate(config: FluxGateConfig)
```

**Configuration Options:**

| Option     | Type      | Required | Default                           | Description                     |
| ---------- | --------- | -------- | --------------------------------- | ------------------------------- |
| `apiKey`   | `string`  | ✅       | -                                 | Your FluxGate API key           |
| `endpoint` | `string`  | ❌       | `https://fluxgate.app/api/events` | API endpoint URL                |
| `timeout`  | `number`  | ❌       | `5000`                            | Request timeout in milliseconds |
| `debug`    | `boolean` | ❌       | `false`                           | Enable debug logging            |

#### Methods

##### `recordEvent(event: LLMEvent)`

Records a usage event to FluxGate.

**Parameters:**

```typescript
interface LLMEvent {
  usage: AiEventUsage;
  status?: AiEventStatus | { status: AiEventStatus; errorMessage?: string };
  metadata?: AiEventMetadata;
}
```

**Usage Object:**

```typescript
interface AiEventUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  model?: string;
  provider?: string;
  latencyInMs?: number;
  isStreamed?: boolean;
  streamingDurationInMs?: number;
}
```

**Status Types:**

```typescript
type AiEventStatus =
  | "SUCCESS"
  | "ERROR"
  | "BLOCKED"
  | "MAX_TOKENS"
  | "CONTENT_FILTER"
  | "RECITATION"
  | "MALFORMED_REQUEST";
```

**Metadata Object:**

```typescript
interface AiEventMetadata {
  feature?: string;
  step?: string;
  user?: string | TrackedUser;
  sessionId?: string;
  conversationId?: string;
  [key: string]: unknown; // Custom fields allowed
}

interface TrackedUser {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  monthlyRevenue?: number;
}
```

**Returns:**

```typescript
Promise<CreateAiEventResponse | null>;

interface CreateAiEventResponse {
  id: string;
  createdAt: string;
  cost: number | null;
}
```

## 💡 Usage Examples

### Basic Usage

```typescript
const tracker = new Tracker({
  apiKey: "your-api-key",
});

await tracker.recordEvent({
  usage: {
    inputTokens: 100,
    outputTokens: 50,
  },
  status: "SUCCESS",
});
```

### With Full Metadata

```typescript
await tracker.recordEvent({
  usage: {
    inputTokens: 200,
    outputTokens: 150,
    cachedTokens: 50,
    model: "gpt-4-turbo",
    provider: "openai",
    latencyInMs: 2500,
    isStreamed: true,
    streamingDurationInMs: 3000,
  },
  status: "SUCCESS",
  metadata: {
    feature: "code-generation",
    step: "implementation",
    user: {
      id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      monthlyRevenue: 99.99,
    },
    sessionId: "session-abc",
    conversationId: "conv-xyz",
    customField: "any custom data",
  },
});
```

### Error Tracking

```typescript
await tracker.recordEvent({
  usage: {
    inputTokens: 100,
    outputTokens: 0,
  },
  status: {
    status: "ERROR",
    errorMessage: "API rate limit exceeded",
  },
  metadata: {
    feature: "chatbot",
  },
});
```

### With Debug Mode

```typescript
const tracker = new Tracker({
  apiKey: "your-api-key",
  debug: true, // Logs all events to console
});

await tracker.recordEvent({
  usage: {
    inputTokens: 100,
    outputTokens: 50,
  },
});
// [fluxgate] FluxGate initialized { endpoint: '...', timeout: 5000 }
// [fluxgate] Sending event to ...: { ... }
// [fluxgate] Event sent successfully. Status: 200
```

### Custom Endpoint

```typescript
const tracker = new Tracker({
  apiKey: "your-api-key",
  endpoint: "https://your-custom-domain.com/api/track",
  timeout: 10000,
});
```

## 🔧 Advanced Usage

### Using with SDK Wrappers

This package is typically used through provider-specific wrappers:

- [`@fluxgate/openai`](../openai/README.md) - For OpenAI
- [`@fluxgate/gemini`](../gemini/README.md) - For Google Gemini

### Direct Integration

If you're integrating a custom provider:

```typescript
import { FluxGate, type LLMEvent } from "@fluxgate/sdk";

const fluxgate = new FluxGate({ apiKey: "your-api-key" });

async function trackMyCustomLLM(prompt: string) {
  const start = performance.now();

  try {
    const response = await myCustomLLM.generate(prompt);

    await tracker.recordEvent({
      usage: {
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        model: "custom-model",
        provider: "custom-provider",
        latencyInMs: performance.now() - start,
      },
      status: "SUCCESS",
      metadata: {
        feature: "my-feature",
      },
    });

    return response;
  } catch (error) {
    await tracker.recordEvent({
      usage: {
        inputTokens: 0,
        outputTokens: 0,
      },
      status: {
        status: "ERROR",
        errorMessage: error.message,
      },
    });
    throw error;
  }
}
```

## 🛡️ Error Handling

The tracker is designed to never break your application:

- Network errors are caught and logged (in debug mode)
- Timeouts are handled gracefully
- Returns `null` if tracking fails
- Your main LLM calls continue regardless of tracking status

```typescript
const result = await tracker.recordEvent(event);
if (result === null) {
  // Tracking failed, but your app continues
  console.log("Failed to track event");
}
```

## 📊 Type Exports

All types are exported for use in your application:

```typescript
import type {
  LLMEvent,
  CreateAiEventResponse,
  TrackedUser,
  AiEventMetadata,
  TrackLlmResponse,
  WithTracking,
  AiEventStatus,
  AiEventUsage,
  ExtractedUsage,
  FluxGateConfig,
} from "@fluxgate/sdk";
```

## 🔗 Related Packages

- [@fluxgate/openai](../openai) - OpenAI SDK wrapper
- [@fluxgate/gemini](../gemini) - Gemini SDK wrapper

## 📝 License

MIT
