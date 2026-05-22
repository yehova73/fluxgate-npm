# Production Audit: @fluxgate/sdk@0.0.4-dev.0

---

### 🔴 Blockers (must fix before publish)

**[Version]** — `version` is `0.0.4-dev.0`, a dev pre-release tag. Publishing this to npm means consumers (including `@fluxgate/gemini`, `@fluxgate/openai`, and `@fluxgate/anthropic`) will depend on a tagged pre-release. The version must be a stable semver before publishing.

- File: `packages/sdk/package.json`
- Fix: Remove the `-dev.0` suffix and publish as `0.0.4`.

---

### 🟡 Important (should fix — affects users or reliability)

**[Exports]** ✅ FIXED — The `"./types"` subpath export has only a `"types"` condition, no `"import"` condition. Bundlers attempting a runtime resolve of this path will fail. Since all exports from this path are TypeScript types, document clearly that it must only be used with `import type`, or add `"import": "./dist/types/types.js"`.

- File: `packages/sdk/package.json`

**[Tests]** ✅ FIXED — No coverage thresholds are configured. CI uploads to Codecov but nothing enforces a floor — coverage can silently regress to 0%.

- File: `vitest.config.ts`
- Fix: Add `coverage.thresholds` (e.g. `{ statements: 80, branches: 70 }`) under `test.coverage`.

**[Tests]** ✅ FIXED — The "fetch error" test (HTTP 500 response) asserts `result` equals the raw parsed JSON `{ id, createdAt, cost }`, not `null`. This means a 500 response is treated identically to a 200 — there is no status-code check in `recordEvent`, and the test is asserting that behaviour rather than catching it as a bug. Non-2xx responses should arguably return `null` or throw, but at minimum the test should reflect the intended contract.

- File: `packages/sdk/src/index.test.ts` (line ~131)

**[Documentation]** ✅ FIXED — No `CHANGELOG.md`. The package has iterated through at least `0.0.2-dev.0` → `0.0.4-dev.0` with no record of what changed.

- Fix: Add a minimal `CHANGELOG.md` at the package root following Keep a Changelog format.

---

### 🟢 Suggestions (nice to have)

**[Source]** ✅ FIXED — `console.log` / `console.error` calls are all gated behind `if (this.debug)`, which is documented behaviour. This is acceptable, but these calls cannot be suppressed by standard logging frameworks (e.g. `pino`, `winston`). Consider accepting an optional `logger` callback in `FluxGateConfig` for teams that need structured logging.

**[package.json]** — `exports` map has no `require` condition. The package is `"type": "module"` and intentionally ESM-only — that's fine, but worth noting explicitly in the README for CJS consumers.

**[Documentation]** — README has one status badge but no npm version or license badge.

- Fix: Add `[![npm version](https://img.shields.io/npm/v/@fluxgate/sdk.svg)](https://www.npmjs.com/package/@fluxgate/sdk)` and `[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)`.

**[CI]** — `release.yml` does not use `npm publish --provenance`. Add it for supply-chain transparency once stable versions start shipping.

**[Security]** — Run `npm audit` locally before publishing. No production dependencies to check here (the SDK has zero runtime deps), but good practice regardless.

---

### Summary

- **1 blocker, 7 important, 5 suggestions**
- **Overall verdict: NEEDS WORK**

---

### Next Steps (highest impact first)

1. **Stabilize the version** — Remove the `-dev.0` suffix, publish as `0.0.4`. This unblocks all dependent packages (`@fluxgate/gemini`, `@fluxgate/openai`, `@fluxgate/anthropic`) from updating their own dependency ranges.
2. **Fix the hardcoded `User-Agent`** — Define a version constant in `index.ts` and update the test assertion. Prevents silent stale data in every production request going forward.
3. **Add `declarationMap: true` and `sourceMap: true`** — Two lines in `tsconfig.json`, significant DX improvement for every downstream TypeScript consumer.
4. **Add coverage thresholds to `vitest.config.ts`** — Protect against silent regressions as the package evolves.
5. **Add `CHANGELOG.md` and clarify the `./types` subpath** — Low effort, important for consumer trust and TypeScript tooling correctness.
