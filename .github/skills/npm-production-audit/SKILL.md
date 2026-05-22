---
name: npm-production-audit
description: "Audit an npm package for production readiness and output a detailed report of what needs to change. Use when: reviewing a package before publishing; checking if a package is production-ready; finding missing fields, bad config, security issues, weak test coverage, poor docs, or bundle problems in a package under packages/. Triggers: 'audit', 'production ready', 'review package', 'what's missing', 'pre-publish check', 'release check'."
argument-hint: "Package name or path, e.g. 'openai' or 'packages/anthropic'"
---

# npm Package Production Audit

Produces a structured, prioritized report of everything that must be fixed or improved before a package can be safely published to npm and considered production-grade.

## When to Use

- User wants to publish a package and isn't sure it's ready
- User asks "what's wrong with this package", "is this production-ready", "review my package"
- Pre-release checklist before bumping the version and running `npm publish`
- After large refactors — verify nothing is broken or missing

## Output Format

Always produce a report with the following structure:

```
## Production Audit: <package-name>@<version>

### 🔴 Blockers (must fix before publish)
### 🟡 Important (should fix — affects users or reliability)
### 🟢 Suggestions (nice to have — quality and DX improvements)

### Summary
- X blockers, Y important, Z suggestions
- Overall verdict: NOT READY / NEEDS WORK / READY
```

Each finding: **[Category]** — short description + the specific file/line + what the fix is.

---

## Procedure

### Step 1 — Resolve the Target Package

If the user gave a package name (e.g. `openai`), resolve it to `packages/openai/`. If a path, use it directly. If ambiguous, ask.

Read these files in parallel to collect all context at once:

- `packages/<name>/package.json`
- `packages/<name>/tsconfig.json`
- `packages/<name>/README.md`
- `packages/<name>/src/index.ts`
- `packages/<name>/src/types/types.ts` (if it exists)

Then scan directory listings for:

- `packages/<name>/src/` — all source files
- `packages/<name>/examples/` — example files

---

### Step 2 — Audit package.json

Use [./references/package-json-checklist.md](./references/package-json-checklist.md) as the complete checklist.

Key checks (flag as 🔴 Blocker if missing):

| Field                         | Why it matters                                                   |
| ----------------------------- | ---------------------------------------------------------------- |
| `name`                        | Must be scoped or unique; no typos                               |
| `version`                     | Must follow semver; not `0.0.0` or `1.0.0` without intent        |
| `main` / `module` / `exports` | Missing = broken imports for consumers                           |
| `types` / `typings`           | Missing = TypeScript users get no type safety                    |
| `files`                       | Missing = entire repo published including source, tests, configs |
| `license`                     | Missing = legally ambiguous                                      |
| `peerDependencies`            | SDK packages (openai, anthropic, etc.) must be peers, not deps   |
| `publishConfig`               | Required if scoped package needs `--access public`               |

Flag as 🟡 Important if missing:

- `description`, `keywords`, `author`, `repository`, `bugs`, `homepage`
- `engines` (Node version constraint)
- `sideEffects: false` (missing blocks tree-shaking)

Flag as 🟢 Suggestion:

- `funding`, `contributors`
- `exports` map has `require` + `import` dual-mode entries

---

### Step 3 — Audit TypeScript / Build Config

Read `tsconfig.json`. Check:

**🔴 Blockers:**

- `declaration: true` — missing means no `.d.ts` files are emitted → users have no types
- `outDir` is set and points outside `src/`
- `strict: true` or at minimum `noImplicitAny: true` — weak typing hides bugs

**🟡 Important:**

- `declarationMap: true` — missing means "Go to Definition" jumps to `.d.ts` not source
- `sourceMap: true` — missing makes debugging harder for downstream users
- `target` is not too old (avoid `ES5`; target `ES2020` or later unless specifically needed)
- `moduleResolution` is `node16` or `bundler` — `node` is legacy and causes ESM issues

**🟢 Suggestions:**

- `stripInternal: true` — hides `@internal` symbols from published types
- `exactOptionalPropertyTypes: true`

---

### Step 4 — Audit Source Code

Scan all files under `packages/<name>/src/`. For each file:

**🔴 Blockers:**

- `console.log` / `console.error` in non-example, non-test code → use proper logging or remove
- `process.exit()` calls in library code → should throw errors instead
- Hardcoded secrets, API keys, credentials (look for patterns like `sk-`, `Bearer `, `password =`)
- Untyped `any` in public-facing function signatures (exported functions)
- Missing `export` on types/functions referenced in `index.ts`

**🟡 Important:**

- Error objects that don't extend `Error` (e.g. `throw "some string"`)
- No input validation on public API entry points
- Circular imports (can cause runtime failures)
- `TODO` / `FIXME` comments in exported code paths

**🟢 Suggestions:**

- Prefer `unknown` over `any` for catch blocks
- No JSDoc on exported public symbols
- Unused imports (dead code)

---

### Step 5 — Audit Tests

Check for test files (`*.test.ts`, `*.spec.ts`) and read the root `vitest.config.ts` or `jest.config.*`.

**🔴 Blockers:**

- No test files exist at all
- Tests exist but `npm test` script is missing in `package.json`

**🟡 Important:**

- Coverage threshold not configured (no way to enforce minimums)
- Public exported functions have no test coverage
- Tests only cover the happy path — no error cases or edge cases tested
- Tests import private internals directly rather than the public `index.ts`

**🟢 Suggestions:**

- Coverage < 80% on statements/branches
- No snapshot or integration tests
- Test file naming inconsistent with convention

---

### Step 6 — Audit Documentation

Read `README.md` and `examples/README.md` (if it exists).

**🔴 Blockers:**

- `README.md` is empty, a placeholder, or still has template text (e.g. "TODO", "Your package name here")
- Install instructions reference a package name that doesn't match `package.json` `name`

**🟡 Important:**

- No Quick Start / usage example in README
- Exported functions not documented (no API Reference section)
- Examples in README don't match actual current API signatures
- No `CHANGELOG.md` or `CHANGELOG` section

**🟢 Suggestions:**

- No badges (build status, npm version, license)
- `examples/README.md` doesn't list all example files
- No "Requirements" / "Prerequisites" section

---

### Step 7 — Audit Security

Run a dependency check by reading `package.json` dependencies. You cannot run `npm audit` directly, but flag known risk patterns:

**🔴 Blockers:**

- Any `dependencies` or `devDependencies` pinned to a known insecure version pattern (e.g. `*`, `latest` in production deps)
- Use of `eval()`, `Function()` constructor, or `child_process.exec` with user-controlled input

**🟡 Important:**

- Production `dependencies` include packages that should be `devDependencies` (test runners, type packages, build tools)
- No `.npmignore` and `files` field not set → risk of publishing test keys, env files, or config secrets
- `postinstall` scripts in `package.json` (supply chain risk — flag for review)

**🟢 Suggestions:**

- Recommend user run `npm audit` locally before publishing
- Lock file (`package-lock.json` / `pnpm-lock.yaml`) should be committed for apps, not for libraries

---

### Step 8 — Audit CI / Release Readiness

Check for `.github/workflows/` or equivalent CI config.

**🟡 Important (no 🔴 blockers here — CI is not required, but strongly advised):**

- No CI pipeline → manual publish risk
- No automated test run on PRs
- No publish workflow (GitHub Actions `npm publish` on tag)
- Version in `package.json` unchanged from a prior release (if you can tell)

**🟢 Suggestions:**

- No release automation (semantic-release, changesets, etc.)
- No provenance (`npm publish --provenance`) for supply chain transparency

---

### Step 9 — Compile and Output the Report

Aggregate all findings. Sort within each severity tier by category. Write the full report in the format specified under **Output Format** above.

End with a **"Next Steps"** list: the top 3–5 highest-impact actions the user should take first, in order.
