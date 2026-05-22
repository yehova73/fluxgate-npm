# Production Audit: @fluxgate/gemini@0.0.3

---

### 🔴 Blockers (must fix before publish)

**[Dependencies]** — `@fluxgate/sdk` is pinned to `^0.0.4-dev.0`, a dev pre-release version. If that exact tag isn't published to npm, consumer installs will fail. Even if it is published, shipping a production package that depends on a `dev` pre-release is a strong signal the package is not ready. Update to a stable release version (e.g. `^0.0.4`) before publishing.

- File: `packages/gemini/package.json`
- Fix: Publish `@fluxgate/sdk@0.0.4` (drop the `-dev.0` tag) and update this range to `^0.0.4`.

---

### 🟡 Important (should fix — affects users or reliability)

**[tsconfig]** — `declarationMap: true` is not set. Downstream TypeScript users who "Go to Definition" will land in compiled `.d.ts` files instead of the original source. This is a significant DX regression for a library.

- File: `packages/gemini/tsconfig.json`
- Fix: Add `"declarationMap": true` to `compilerOptions`.

**[tsconfig]** — `sourceMap: true` is not set. Debugging stack traces from bundled downstream apps won't map back to library source lines.

- File: `packages/gemini/tsconfig.json`
- Fix: Add `"sourceMap": true` to `compilerOptions`.

**[Tests]** — No coverage threshold is configured in `vitest.config.ts`. The CI uploads coverage to Codecov but there is no minimum enforcement — a future PR could silently regress coverage to 0%.

- File: `vitest.config.ts`
- Fix: Add `coverage.thresholds` (e.g. `{ statements: 80, branches: 70 }`) under the `test.coverage` block.

**[Tests]** — The three main wrappers (`generateContent`, `generateContentStream`, `embedContent`) and `chatSession` have no dedicated unit tests — only smoke tests in `index.test.ts` that verify the wrapped methods exist and are functions. No actual call-path or error-path logic is exercised for these wrappers.

- Files: `packages/gemini/src/wrappers/generateContent.ts`, `generateContentStream.ts`, `embedContent.ts`, `chatSession.ts`
- Fix: Add mocked wrapper tests for the happy path, the error-catch path (tracking still fires), and tracking failures being swallowed (not re-thrown).

**[Tests]** — `finishReasonToStatus` in `recordUsage.ts` has no tests despite being a multi-branch status mapper that directly affects what gets recorded as `SUCCESS`, `BLOCKED`, `MAX_TOKENS`, etc.

- File: `packages/gemini/src/utils/recordUsage.ts`
- Fix: Add a `recordUsage.test.ts` covering each `finishReason` branch.

**[Exports]** — The `"./types"` subpath export has only a `"types"` condition and no `"import"` condition. If a bundler resolves this entry at runtime (e.g. a user accidentally writes a value import instead of a type-only import), it will fail to resolve. It's also invisible to non-TypeScript tools.

- File: `packages/gemini/package.json`
- Fix: Either add `"import": "./dist/types/types.js"` to the entry, or document clearly that this subpath is types-only and must only be used with `import type`.

**[Documentation]** — No `CHANGELOG.md`. With three published versions already (`0.0.1`→`0.0.3`), there is no record of what changed between releases.

- Fix: Add a `CHANGELOG.md` (even a minimal one) at the package root following Keep a Changelog format.

---

### 🟢 Suggestions (nice to have)

**[package.json]** — `exports` map has no `require` condition. The package is intentionally ESM-only, which is fine, but adding an explicit `"default"` condition or a clear comment in the README that CJS consumers are unsupported prevents confusion.

**[tsconfig]** — `stripInternal: true` is not set. Any symbol annotated with `@internal` JSDoc will be included in the published `.d.ts` files.

- Fix: Add `"stripInternal": true` to `compilerOptions`.

**[Source]** — `embedContent` records zero prompt tokens (Gemini doesn't provide them in the embed response). A comment explains this, but it means cost tracking for embeddings is effectively a no-op (`cost: null` always). Consider documenting this known limitation in the README under the `models.embedContent()` entry so users are not surprised.

- File: `packages/gemini/src/wrappers/embedContent.ts`

**[Documentation]** — README has one badge ("Status: In Development") but no npm version or license badges. These give consumers an instant signal of the current published version.

- Fix: Add `[![npm version](https://img.shields.io/npm/v/@fluxgate/gemini.svg)](https://www.npmjs.com/package/@fluxgate/gemini)` and `[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)`.

**[CI]** — No `npm publish --provenance` flag in `release.yml`. GitHub's OIDC provenance provides a verifiable link between the published package and the source commit, which is increasingly expected for supply-chain transparency.

**[Security]** — Recommend running `npm audit` locally before cutting the release. Cannot inspect transitively pinned versions from here.

---

### Summary

- **1 blocker, 6 important, 5 suggestions**
- **Overall verdict: NEEDS WORK**

---

### Next Steps (highest impact first)

1. **Stabilize the `@fluxgate/sdk` dependency** — Publish a stable `0.0.4` (no `-dev.0` tag) and update the range in `package.json`. This is the only hard blocker.
2. **Add `declarationMap: true` and `sourceMap: true`** to `tsconfig.json` — Two-line fix, large DX win for every downstream TypeScript user.
3. **Write wrapper unit tests** — Mock `ai.models.generateContent` / `ai.models.embedContent` / `ai.chats.create` and assert that the correct tracking call is made, the error path records usage before rethrowing, and tracking failures don't leak. Also add `finishReasonToStatus` branch tests.
4. **Add coverage thresholds to `vitest.config.ts`** — Enforce a floor so CI fails if coverage regresses below an acceptable minimum.
5. **Add `CHANGELOG.md`** and clarify the `"./types"` subpath export semantics (types-only) in the README.
