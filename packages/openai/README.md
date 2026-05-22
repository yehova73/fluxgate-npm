# @fluxgate/openai

[![npm version](https://img.shields.io/npm/v/@fluxgate/openai.svg)](https://www.npmjs.com/package/@fluxgate/openai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/yehova73/fluxgate-npm/actions/workflows/ci.yml/badge.svg)](https://github.com/yehova73/fluxgate-npm/actions/workflows/ci.yml)

OpenAI SDK wrapper for [FluxGate](https://fluxgate.app). You can easily track and manage your OpenAI API token usage, costs, and performance.

## Installation

```bash
npm install @fluxgate/openai
```

> **ESM only** — this package is ESM-only (`"type": "module"`), matching `openai` v5+. Your project must use ESM (set `"type": "module"` in `package.json` or use `.mjs` extensions). Node.js ≥ 18 is required.

Get your FluxGate API key at [fluxgate.app](https://fluxgate.app).

## Quick Start

```typescript
import OpenAI from "openai";
import { FluxGate } from "@fluxgate/sdk";
import { createOpenAICostTracker } from "@fluxgate/openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fluxgate = new FluxGate({ apiKey: process.env.FLUXGATE_API_KEY });

const openai = createOpenAICostTracker(client, fluxgate);

const response = await openai
  .withContext({ feature: "chat", user: "user-123" })
  .chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hello!" }],
  });

console.log(response.fluxGateCostTrackingResponse);
// { status: "SUCCESS", cost: 0.0015, trackingId: "evt_...", createdAt: 1748000000000 }
```

## API Reference

### `createOpenAICostTracker(client, fluxgate)`

Creates a tracked OpenAI client.

**Parameters:**

- `client` — OpenAI client instance
- `fluxgate` — FluxGate instance

**Returns:**

- `withContext(ctx: FluxGateContext)` — returns a tracked client bound to the given context
- `client` — tracked client with no context

---

### `FluxGateContext`

All fields are optional. Pass to `withContext()` to annotate tracked events.

| Field            | Type                      | Description                                                         |
| ---------------- | ------------------------- | ------------------------------------------------------------------- |
| `user`           | `string \| UserSession`   | End-user ID or a `UserSession` object (see below)                   |
| `feature`        | `string`                  | Product feature name (e.g. `"chat"`, `"summarization"`)             |
| `step`           | `string`                  | Step within a feature pipeline (e.g. `"retrieval"`, `"generation"`) |
| `sessionId`      | `string`                  | Session identifier                                                  |
| `conversationId` | `string`                  | Conversation identifier                                             |
| `costOverride`   | `OpenAICostOverride`      | Override per-token pricing for cost calculation (see below)         |
| `metadata`       | `Record<string, unknown>` | Arbitrary key-value pairs forwarded to the event metadata           |

> **Auto-captured fields** — `service_tier` and `region` are captured automatically and do not need to be passed in context. `service_tier` is read from the `.create()` request/response params. Region is detected from the client's `baseURL` (e.g. `eu.api.openai.com` → `"eu"`). Supported region prefixes: `us`, `eu`, `au`, `ca`, `jp`, `in`, `sg`, `kr`, `gb`, `ae`.

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
await openai
  .withContext({
    feature: "chat",
    user: {
      id: "user-123",
      name: "Alice",
      email: "alice@example.com",
      monthlyRevenue: 49.99,
    },
  })
  .chat.completions.create({ ... });
```

---

### `OpenAICostOverride`

Supply custom per-token rates when FluxGate does not have pricing for a model (e.g. fine-tuned or self-hosted models). All rates are **per 1 million tokens**.

| Field                      | Type             | Description                                           |
| -------------------------- | ---------------- | ----------------------------------------------------- |
| `inputCostPer1MTokens`     | `number`         | Required. Cost per 1M prompt/input tokens in USD      |
| `outputCostPer1MTokens`    | `number`         | Required. Cost per 1M completion/output tokens in USD |
| `cacheReadCostPer1MTokens` | `number \| null` | Cost per 1M tokens read from prompt cache             |
| `reasoningCostPer1MTokens` | `number \| null` | Cost per 1M reasoning tokens (o1/o3 models)           |

```typescript
await openai
  .withContext({
    feature: "fine-tuned-chat",
    costOverride: {
      inputCostPer1MTokens: 3.00,
      outputCostPer1MTokens: 6.00,
    },
  })
  .chat.completions.create({ ... });
```

---

### Tracked Methods

Every call returns the standard OpenAI SDK response intersected with `fluxGateCostTrackingResponse`.

- `chat.completions.create()` — chat completions (streaming + non-streaming)
- `completions.create()` — legacy completions (streaming + non-streaming)
- `responses.create()` — Responses API (streaming + non-streaming)
- `embeddings.create()` — embeddings

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
| `BLOCKED`           | Response stopped by a content filter                   |
| `MAX_TOKENS`        | Generation stopped because the token limit was reached |
| `CONTENT_FILTER`    | Provider flagged content mid-generation                |
| `MALFORMED_REQUEST` | Request was rejected before inference                  |

> **Streaming:** `fluxGateCostTrackingResponse` is populated only after the stream is fully consumed (i.e. after the `for await` loop completes or throws). Accessing it before that returns a pending promise.

---

## Examples

Full runnable examples are available in the [repository](https://github.com/fluxgate/fluxgate-npm/tree/main/packages/openai/examples):

- `basic-chat.ts` — `chat.completions.create`, `responses.create`, no-context usage
- `chat-completions.ts` — multi-turn chat, tool calling, structured JSON output
- `responses.ts` — Responses API: basic, streaming, multi-turn, web search, structured output, system instructions
- `streaming.ts` — streaming `chat.completions.create` and `responses.create`
- `embeddings.ts` — single and batch embeddings
- `error-handling.ts` — error tracking, stream errors, legacy completions, regional endpoints
- `multiple-contexts.ts` — feature isolation, `UserSession`, `serviceTier`, `costOverride`
