# Changelog

All notable changes to `@fluxgate/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.5] — 2026-05-22

### Added

- Optional `logger` callback in `FluxGateConfig` — pass any `(level, message, data?) => void` function to route debug output through your own logging framework (e.g. `pino`, `winston`) instead of `console`.
- `FluxGateLogger` type exported from `@fluxgate/sdk`.

### Fixed

- All test mocks now include `ok: true` on successful fetch responses, correctly exercising the non-2xx guard added in 0.0.4.

## [0.0.4] — 2026-05-22

### Fixed

- `recordEvent` now returns `null` for non-2xx HTTP responses instead of returning the raw error body as if it were a valid tracking response.

### Added

- `"import"` condition added to the `"./types"` subpath export in `package.json` so bundlers can resolve the entry at runtime.

## [0.0.3] — Internal

## [0.0.2] — Internal

## [0.0.1] — Initial release

### Added

- `FluxGate` class with `recordEvent` method.
- Full TypeScript type exports: `LLMEvent`, `AiEventUsage`, `Performance`, `AiEventStatus`, `AiEventMetadata`, `CostOverride`, `UserSession`, `CreateAiEventResponse`, `FluxGateCostTrackingResponse`, `WithTracking`, `ExtractedUsage`, `FluxGateConfig`.
- Configurable endpoint, timeout, and debug mode.
- Graceful error handling — tracking failures never surface as user-facing errors.
