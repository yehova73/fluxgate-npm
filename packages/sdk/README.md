# @fluxgate/sdk

![Status: In Development](https://img.shields.io/badge/status-in%20development-orange)

Core tracking functionality for FluxGate. This package provides the base `FluxGate` class that sends usage data to the FluxGate API.

## 📦 Installation

```bash
npm install @fluxgate/sdk
```

Get your FluxGate API key at [fluxgate.app](https://fluxgate.app) before initializing the client.

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

- **`apiKey`**
  - Type: `string`
  - Required: ✅ Yes
  - Default: none
  - Description: Your FluxGate API key. Get a free one at [fluxgate.app](https://fluxgate.app).

- **`endpoint`**
  - Type: `string`
  - Required: ❌ No
  - Default: `https://fluxgate.app/api/events`
  - Description: API endpoint URL.

- **`timeout`**
  - Type: `number`
  - Required: ❌ No
  - Default: `5000`
  - Description: Request timeout in milliseconds. On edge runtimes (Cloudflare Workers, Vercel Edge) with tight execution limits, set this lower and confirm your runtime supports `fetch` with `AbortSignal`.

- **`debug`**
  - Type: `boolean`
  - Required: ❌ No
  - Default: `false`
  - Description: Enable debug logging.

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
  user?: string | UserSession;
  feature?: string;
  step?: string;
  sessionId?: string;
  conversationId?: string;
  timestamp?: number; // Unix ms — defaults to server ingest time if omitted
  metadata?: AiEventMetadata;
  costOverride?: CostOverride;
};
```

<details>
<summary><strong>Performance</strong> — latency, status, and streaming fields</summary>

```typescript
type Performance = {
  latency: number; // Total round-trip time in milliseconds
  status: AiEventStatus; // HTTP status category from the provider
  isStreamed: boolean; // Whether the response used SSE streaming
  streamDuration?: number | null; // Active streaming duration in ms (null if not streamed)
  errorMessage?: string | null; // Raw error string if the request failed
};

type AiEventStatus =
  | "SUCCESS"
  | "ERROR"
  | "BLOCKED"
  | "MAX_TOKENS"
  | "CONTENT_FILTER"
  | "RECITATION"
  | "MALFORMED_REQUEST";
```

</details>

<details>
<summary><strong>AiEventUsage</strong> — token count fields</summary>

```typescript
type AiEventUsage = {
  promptTokens: number; // Input / prompt tokens
  completionTokens: number; // Output / completion tokens
  cacheReadTokens?: number | null; // Tokens read from a warm cache
  cacheWriteTokens?: number | null; // Tokens written to initialize a cache
  reasoningTokens?: number | null; // Internal thinking tokens (e.g. o1, DeepSeek R1)
};
```

</details>

<details>
<summary><strong>AiEventMetadata</strong>, <strong>UserSession</strong>, and <strong>CostOverride</strong> — optional enrichment fields</summary>

```typescript
type AiEventMetadata = {
  serviceTier?: "default" | "standard" | "batch" | "flex" | "priority";
  region?: string; // Hosting region for regional price variance
  openrouterCost?: number; // Explicit cost in USD from a proxy (skips server-side compute)
  cacheTtl?: string; // Provider cache expiration window (e.g. "5m", "1h")
  [key: string]: unknown; // Custom fields allowed
};

type UserSession = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  monthlyRevenue?: number | string | null; // Monthly revenue in USD
};

type CostOverride = {
  inputCostPer1MTokens: number; // Price per 1M prompt tokens in USD
  outputCostPer1MTokens: number; // Price per 1M completion tokens in USD
  cacheWriteCostPer1MTokens?: number | null; // Surcharge for writing a prompt segment to cache
  cacheReadCostPer1MTokens?: number | null; // Discounted rate for reading from a warm cache
  reasoningCostPer1MTokens?: number | null; // Rate for reasoning/thinking tokens
};
```

</details>

**Returns:**

```typescript
Promise<CreateAiEventResponse | null>;

type CreateAiEventResponse = {
  recordId: string; // ID of the persisted AiEvent record
  totalTokens: number; // Sum of all token categories
  totalCost: number | null; // Computed cost in USD; null when no pricing data available
  status: "ok" | "no_pricing"; // "no_pricing" when model/provider not in pricing table
  timestamp?: number; // Unix timestamp in milliseconds
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
        latency: Math.round(performance.now() - start),
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
        latency: Math.round(performance.now() - start),
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

## 🛡️ Error Handling & Performance

The tracker is designed to be completely non-blocking and safe for production critical paths:

- Network errors are caught internally and logged (in debug mode).
- Timeouts are handled gracefully, returning `null` if tracking fails.
- Your main application flows continue completely uninterrupted regardless of tracking status.

### Non-Blocking (Fire-and-Forget) Execution

If you want to track events without blocking your user-facing response time, you can safely trigger `recordEvent` without using the `await` keyword:

```typescript
// Fires the tracking request in the background without awaiting the network trip
fluxgate
  .recordEvent({
    provider: "openai",
    model: "gpt-4o",
    performance: { latency: 1200, status: "SUCCESS", isStreamed: false },
    usage: { promptTokens: 80, completionTokens: 40 },
  })
  .catch((err) => {
    if (config.debug) console.error("Background tracking failed:", err);
  });
```

## 📊 Type Exports

All types are exported for use in your application:

```typescript
import type {
  LLMEvent,
  CreateAiEventResponse,
  UserSession,
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
- [@fluxgate/anthropic](../anthropic) - Anthropic SDK wrapper

## 📝 License

MIT
