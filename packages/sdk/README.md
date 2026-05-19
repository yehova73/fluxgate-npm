# @fluxgate/sdk

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)

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
  provider: "openai",
  model: "gpt-4o",
  feature: "chatbot",
  user: "user-123",
  performance: {
    latency: 1500,
    status: "SUCCESS",
    isStreamed: false,
  },
  usage: {
    promptTokens: 100,
    completionTokens: 50,
  },
});

console.log(response);
// {
//   recordId: "evt_...",
//   totalTokens: 150,
//   totalCost: 0.0015,
//   status: "ok",
// }
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
type LLMEvent = {
  provider: string; // AI provider (e.g. "openai", "anthropic", "google")
  model: string; // Model identifier (e.g. "gpt-4o", "claude-opus-4")
  performance: Performance; // Latency, status, and streaming info
  usage: AiEventUsage; // Token counts
  user?: string | TrackedUser;
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  timestamp?: number; // Unix ms — defaults to server ingest time if omitted
  metadata?: AiEventMetadata;
  costOverride?: CostOverride;
};
```

**Performance Object:**

```typescript
type Performance = {
  latency: number; // Total round-trip time in milliseconds
  status: AiEventStatus; // HTTP status category from the provider
  isStreamed: boolean; // Whether the response used SSE streaming
  streamDuration?: number | null; // Active streaming duration in ms (null if not streamed)
  errorMessage?: string | null; // Raw error string if the request failed
};
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

**Usage Object:**

```typescript
type AiEventUsage = {
  promptTokens: number; // Input / prompt tokens
  completionTokens: number; // Output / completion tokens
  cacheReadTokens?: number | null; // Tokens read from a warm cache
  cacheWriteTokens?: number | null; // Tokens written to initialize a cache
  reasoningTokens?: number | null; // Internal thinking tokens (e.g. o1, DeepSeek R1)
};
```

**Metadata Object:**

```typescript
type AiEventMetadata = {
  serviceTier?: "default" | "standard" | "batch" | "flex" | "priority";
  region?: string; // Hosting region for regional price variance
  openrouterCost?: number; // Explicit cost in USD from a proxy (skips server-side compute)
  cacheTtl?: string; // Provider cache expiration window (e.g. "5m", "1h")
  [key: string]: unknown; // Custom fields allowed
};

type TrackedUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  monthlyRevenue?: number | string | null; // Monthly revenue in USD
};
```

**Returns:**

```typescript
Promise<CreateAiEventResponse | null>;

type CreateAiEventResponse = {
  recordId: string; // ID of the persisted AiEvent record
  totalTokens: number; // Sum of all token categories
  totalCost: number | null; // Computed cost in USD; null when no pricing data available
  status: "ok" | "no_pricing"; // "no_pricing" when model/provider not in pricing table
  description?: string; // Human-readable explanation of cost derivation
};
```

## 💡 Usage Examples

### Basic Usage

```typescript
const fluxgate = new FluxGate({
  apiKey: "your-api-key",
});

await fluxgate.recordEvent({
  provider: "openai",
  model: "gpt-4o",
  performance: {
    latency: 1500,
    status: "SUCCESS",
    isStreamed: false,
  },
  usage: {
    promptTokens: 100,
    completionTokens: 50,
  },
});
```

### With Full Metadata

```typescript
await fluxgate.recordEvent({
  provider: "openai",
  model: "gpt-4-turbo",
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
  performance: {
    latency: 2500,
    status: "SUCCESS",
    isStreamed: true,
    streamDuration: 3000,
  },
  usage: {
    promptTokens: 200,
    completionTokens: 150,
    cacheReadTokens: 50,
  },
  metadata: {
    customField: "any custom data",
  },
});
```

### Error Tracking

```typescript
await fluxgate.recordEvent({
  provider: "openai",
  model: "gpt-4o",
  feature: "chatbot",
  performance: {
    latency: 300,
    status: "ERROR",
    isStreamed: false,
    errorMessage: "API rate limit exceeded",
  },
  usage: {
    promptTokens: 100,
    completionTokens: 0,
  },
});
```

### With Debug Mode

```typescript
const fluxgate = new FluxGate({
  apiKey: "your-api-key",
  debug: true, // Logs all events to console
});

await fluxgate.recordEvent({
  provider: "openai",
  model: "gpt-4o",
  performance: { latency: 1000, status: "SUCCESS", isStreamed: false },
  usage: { promptTokens: 100, completionTokens: 50 },
});
// [fluxgate] FluxGate initialized { endpoint: '...', timeout: 5000 }
// [fluxgate] Sending event to ...: { ... }
// [fluxgate] Event sent successfully. Status: 200. Response: { "recordId": "evt_...", ... }
```

### Custom Endpoint

```typescript
const fluxgate = new FluxGate({
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
- [`@fluxgate/anthropic`](../anthropic/README.md) - For Anthropic

### Direct Integration

If you're integrating a custom provider:

```typescript
import { FluxGate, type LLMEvent } from "@fluxgate/sdk";

const fluxgate = new FluxGate({ apiKey: "your-api-key" });

async function trackMyCustomLLM(prompt: string) {
  const start = performance.now();

  try {
    const response = await myCustomLLM.generate(prompt);

    await fluxgate.recordEvent({
      provider: "custom-provider",
      model: "custom-model",
      feature: "my-feature",
      performance: {
        latency: performance.now() - start,
        status: "SUCCESS",
        isStreamed: false,
      },
      usage: {
        promptTokens: response.inputTokens,
        completionTokens: response.outputTokens,
      },
    });

    return response;
  } catch (error) {
    await fluxgate.recordEvent({
      provider: "custom-provider",
      model: "custom-model",
      performance: {
        latency: performance.now() - start,
        status: "ERROR",
        isStreamed: false,
        errorMessage: error.message,
      },
      usage: { promptTokens: 0, completionTokens: 0 },
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
  AiEventStatus,
  AiEventUsage,
  Performance,
  CostOverride,
  FluxGateCostTrackingResponse,
  WithTracking,
  ExtractedUsage,
  FluxGateConfig,
} from "@fluxgate/sdk";
```

## 🔗 Related Packages

- [@fluxgate/openai](../openai) - OpenAI SDK wrapper
- [@fluxgate/gemini](../gemini) - Gemini SDK wrapper

## 📝 License

MIT
