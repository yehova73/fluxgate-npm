# @fluxgate/openai — Examples

## Prerequisites

- Node.js >= 18
- `OPENAI_API_KEY` environment variable set
- `FLUXGATE_API_KEY` environment variable set — get one at [fluxgate.app](https://fluxgate.app)

## Setup

```bash
# From the monorepo root
npm install && npm run build
```

## Running Examples

```bash
npx tsx packages/openai/examples/<file>.ts
```

## Files

| File                   | What it covers                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `basic-chat.ts`        | `chat.completions.create`, `responses.create`, no-context usage                                                    |
| `chat-completions.ts`  | Multi-turn chat with message history, tool/function calling, structured JSON output                                |
| `responses.ts`         | Responses API: basic, streaming, multi-turn, web search tool, structured output, system instructions               |
| `conversations.ts`     | Server-side conversation state via `conversations` API + multi-turn `responses.create` with `previous_response_id` |
| `streaming.ts`         | Streaming `chat.completions.create`, streaming `responses.create`                                                  |
| `embeddings.ts`        | Single and batch `embeddings.create`                                                                               |
| `error-handling.ts`    | Automatic error tracking, stream error tracking, legacy `completions.create`, regional endpoint auto-detection     |
| `multiple-contexts.ts` | Feature isolation, rich `UserSession`, `service_tier`, `costOverride`                                             |
