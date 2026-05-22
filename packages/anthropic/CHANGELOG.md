# Changelog

All notable changes to this package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-05-22

### Added

- Added per-call context forking with `messages.withTracking(ctx)`.
- Added per-call context forking with `beta.messages.withTracking(ctx)`.
- Added auto-detection for request metadata:
  - `region` from client `baseURL`.
  - `cacheTtl` from request `cache_control` blocks.
- Added explicit export of `AnthropicCostOverride` and `FluxGateContext` from package root.

### Changed

- Updated `FluxGateContext` to remove request-derived fields (`region`, `cacheTtl`) and proxy-specific fields.
- Updated `costOverride` type to `AnthropicCostOverride`.
- Improved wrapper behavior so tracking failures are swallowed and do not surface as user-facing errors.

### Fixed

- Fixed status reporting to preserve original status values (e.g. `MALFORMED_REQUEST`, `BLOCKED`, `MAX_TOKENS`) instead of collapsing them.
- Fixed README/API docs to reflect current public API and examples.
