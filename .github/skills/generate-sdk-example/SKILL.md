---
name: generate-sdk-example
description: "Generate a comprehensive FluxGate example file for an AI SDK. Use when: building example files for anthropic, openai, or gemini SDK wrappers; showing all chat/embedding/streaming usage patterns; creating a single file demo of the FluxGate cost tracker API surface for a given SDK."
argument-hint: "anthropic | openai | gemini"
---

# Generate SDK Example File

Generates a single, comprehensive TypeScript example file that demonstrates every major usage pattern of a FluxGate-wrapped AI SDK — chat, streaming, embeddings, multi-turn conversations, and error-safe patterns.

## When to Use

- User provides an SDK name: `anthropic`, `openai`, or `gemini`
- User wants to see all usage patterns in one place
- User asks for "a full example", "how do I use X with FluxGate", or "show me all the ways to use Y"

## Procedure

### Step 1 — Identify the SDK

Determine the target SDK from the argument or conversation. Valid values: `anthropic`, `openai`, `gemini`. If ambiguous, ask.

### Step 2 — Scan the SDK Source

Read the wrapper files to discover every tracked method. Use the paths below:

| SDK         | Wrappers path                      | Package import        |
| ----------- | ---------------------------------- | --------------------- |
| `anthropic` | `packages/anthropic/src/wrappers/` | `@fluxgate/anthropic` |
| `openai`    | `packages/openai/src/wrappers/`    | `@fluxgate/openai`    |
| `gemini`    | `packages/gemini/src/wrappers/`    | `@fluxgate/gemini`    |

Also read `packages/<sdk>/src/index.ts` to confirm the public `createXxxCostTracker` export name.

Check existing examples in `packages/<sdk>/examples/` for established patterns and imports to reuse.

### Step 3 — Build the API Surface Map

From the wrappers, identify every tracked method. Common patterns per SDK:

**Gemini** (`createGeminiCostTracker`):

- `gemini.withContext({...}).models.generateContent({...})` — basic generation
- `gemini.withContext({...}).models.generateContentStream({...})` — streaming generation
- `gemini.withContext({...}).models.embedContent({...})` — embeddings
- `gemini.withContext({...}).chats.create({...})` → `chat.sendMessage({...})` — multi-turn chat
- `gemini.withContext({...}).chats.create({...})` → `chat.sendMessageStream({...})` — streaming chat

**OpenAI** (`createOpenAICostTracker`):

- `openai.withContext({...}).chat.completions.create({...})` — chat completions
- `openai.withContext({...}).chat.completions.create({ stream: true, ... })` — streaming completions
- `openai.withContext({...}).responses.create({...})` — responses API
- `openai.withContext({...}).embeddings.create({...})` — single/batch embeddings

**Anthropic** (`createAnthropicCostTracker`):

- `anthropic.withContext({...}).messages.create({...})` — basic message
- `anthropic.withContext({...}).messages.stream({...})` — streaming message
- `anthropic.withContext({...}).messages.create({ stream: true, ... })` — stream flag variant

### Step 4 — Generate the Example File

Write the file to `packages/<sdk>/examples/full-example.ts` (or confirm path with user).

Structure the file as follows:

```
imports
─────────────────────────────────────
async function main() {
  // 1. Client initialization (SDK + FluxGate + wrapped client)

  // 2. Section per feature — each section:
  //    - console.log header ("=== Feature Name ===\n")
  //    - withContext() call with descriptive feature/user fields
  //    - the API call
  //    - log response + fluxGateCostTrackingResponse + usage/metadata

  // SECTIONS (include all that apply for the SDK):
  // === Basic Chat / Generation ===
  // === Streaming ===
  // === Multi-turn Chat Session === (if SDK supports it)
  // === Embeddings === (single, then batch if applicable)
  // === No-context (direct client passthrough) === (optional, shows fallback)
}

main().catch(console.error);
```

Rules:

- Every section must log `fluxGateCostTrackingResponse` on the result
- Use `withContext({ feature: "<section-slug>", user: "demo-user" })` per section; vary `feature` meaningfully
- Use `process.env.XXX_API_KEY || "your-xxx-api-key"` for all keys; never hardcode real keys
- For streaming, iterate with `for await` and write chunks with `process.stdout.write`
- Keep the file self-contained — no helper functions, no shared state between sections
- Add a brief `// --- comment ---` before each section explaining what it demonstrates

### Step 5 — Validate

After writing the file:

1. Check for TypeScript errors with `get_errors` on the new file
2. Confirm every tracked wrapper method found in Step 3 appears in the example
3. Confirm `fluxGateCostTrackingResponse` is logged in every section

### Step 6 — Report

List each section created, the file path, and any wrapper methods that could not be demonstrated (e.g., beta APIs requiring special access). Suggest a follow-up prompt to run the example.

## Reference Patterns

### FluxGate initialization (all SDKs)

```ts
const fluxgate = new FluxGate({
  apiKey: process.env.FLUXGATE_API_KEY || "your-fluxgate-api-key",
  debug: true,
});
```

### withContext shape

```ts
.withContext({
  feature: "section-slug",   // required — identifies the feature/endpoint
  user: "demo-user",         // optional but recommended
  metadata: { key: "val" },  // optional arbitrary metadata
})
```

### Streaming (Gemini generateContentStream)

```ts
const stream = await gemini.withContext({...}).models.generateContentStream({...});
for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? "");
}
console.log("\nTracking:", stream.fluxGateCostTrackingResponse);
```

### Streaming (Anthropic messages.stream)

```ts
const stream = await anthropic.withContext({...}).messages.stream({...});
for await (const chunk of stream) {
  if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
    process.stdout.write(chunk.delta.text);
  }
}
const final = await stream.finalMessage();
console.log("\nTracking:", final.fluxGateCostTrackingResponse);
```

### Streaming (OpenAI chat.completions with stream)

```ts
const stream = await openai.withContext({...}).chat.completions.create({ stream: true, ... });
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```
