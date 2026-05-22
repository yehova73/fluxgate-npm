# Changelog

All notable changes to `@fluxgate/openai` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.7] — 2026-05-22

### Added

- Explicit named exports for `FluxGateContext`, `OpenAICostOverride`, and `OpenAiEventUsage` from the package entry point — consumers can now `import { FluxGateContext } from "@fluxgate/openai"`.
- `clean` script (`npx rimraf dist tsconfig.tsbuildinfo`) for reliable rebuilds.
- `lint` script (`tsc --noEmit`).
- `CHANGELOG.md` for the openai package.
- README badges (npm version, MIT license, CI status).
- Dedicated `publish-openai.yml` GitHub Actions workflow.

### Fixed

- `peerDependencies` corrected from `"openai": "^6.34.0"` to `"^5.0.0"` to match actual SDK compatibility.
- `files` field updated to explicitly include `README.md` and `LICENSE`.

## [0.0.6] — 2026-05-22

### Added

- `responses.create()` tracking — full support for the OpenAI Responses API (streaming and non-streaming), including `response.completed` event capture for accurate usage data.
- `conversations.ts` example demonstrating server-side conversation state via `previous_response_id`.
- Auto-detection of `service_tier` and `region` from request/response params and client `baseURL` respectively.
- `OpenAICostOverride` type — allows custom per-token pricing for fine-tuned or self-hosted models (excludes `cacheWriteCostPer1MTokens`, which OpenAI does not surface).
- `detectProvider` utility — resolves the provider name (`openai`, `azure`, `groq`, `together`, `xai`, `openrouter`, `mistral`, `google`) from the client `baseURL`.

### Fixed

- Streaming wrapper now correctly falls back to request `service_tier` when the stream chunks do not include it.
- `TrackedStream.fluxGateCostTrackingResponse` is now populated in the `finally` block, guaranteeing it is set even when the stream throws.

## [0.0.2] — 2026-05-10

### Added

- Initial `chat.completions.create()` and `completions.create()` tracking (streaming + non-streaming).
- `embeddings.create()` tracking.
- `createOpenAICostTracker(client, fluxgate)` public API with `withContext()` and `client` accessors.
- `TrackedStream<T>` — async-iterable wrapper that resolves `fluxGateCostTrackingResponse` after the stream is fully consumed.
- `FluxGateContext` type with `user`, `feature`, `step`, `sessionId`, `conversationId`, `costOverride`, and `metadata` fields.
