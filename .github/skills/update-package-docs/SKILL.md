---
name: update-package-docs
description: "Update all documentation for a package after code changes. Use when: adding new features, changing APIs, modifying wrappers, updating types, removing methods, bumping versions, or publishing a package. Scans source code and updates README.md, examples/README.md, and inline JSDoc to reflect current behavior."
argument-hint: "Package name or path, e.g. 'openai' or 'packages/anthropic'"
---

# Update Package Documentation

## When to Use

- You added, removed, or renamed exported functions or types
- You changed method signatures, parameters, or return types
- You added or removed supported API methods (e.g. new wrappers)
- You bumped the package version or changed install requirements
- You updated examples or added new example files
- You're about to publish and want docs to match the code

## Documentation Targets

For each package (`packages/<name>/`), these are the files to review and update:

| File                 | What to Update                                                              |
| -------------------- | --------------------------------------------------------------------------- |
| `README.md`          | Installation, Quick Start, API Reference, Supported Methods, Usage Examples |
| `examples/README.md` | List of example files, how to run them, prerequisites                       |
| `src/index.ts`       | Exported symbol list reflects what's actually exported                      |
| `package.json`       | `description`, `keywords`, `version` (if not already bumped)                |

## Procedure

### Step 1 — Identify the Target Package

If the user specified a package name or path, resolve it. If not, look at the most recently modified package or ask.

Locate:

- `packages/<name>/src/` — all source files
- `packages/<name>/README.md`
- `packages/<name>/examples/README.md`
- `packages/<name>/package.json`

### Step 2 — Audit the Source Code

Read the following source files to understand the current public API:

1. `src/index.ts` — all exports (functions, types, classes)
2. `src/types/types.ts` — exported types and interfaces
3. `src/wrappers/createWrappedClient.ts` — client factory shape and options
4. All other files in `src/wrappers/` — which SDK methods are wrapped and tracked
5. `src/utils/extractUsage.ts` — how usage data is extracted (for accuracy in docs)

For each wrapper, note:

- The method name and signature
- What it tracks (tokens, cost, latency, streaming)
- Whether it returns `fluxGateCostTrackingResponse` on the result

### Step 3 — Audit the Examples

Read every `.ts` file in `examples/`:

- What does each example demonstrate?
- Does `examples/README.md` list all of them with the correct run command?
- Are the run commands (`npx tsx packages/<name>/examples/<file>.ts`) still accurate?

### Step 4 — Compare Docs to Source

Check each README section against what you found in Steps 2–3:

**Installation block**: Does it list the correct peer dependencies (e.g. `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`)?

**Quick Start**: Does the import path and function name match `src/index.ts` exports? Does the example use a real model name and valid options?

**API Reference — `createXxxCostTracker(client, tracker)`**: Are the parameter names, types, and return shape correct?

**Tracked Methods checklist**: Does the ✅/❌ list match what's actually wrapped in `src/wrappers/`?

**Usage Examples section**: Do the code snippets compile against the current types and signatures?

**`examples/README.md`**: Is every file in `examples/` listed? Are run commands correct?

### Step 5 — Update the Files

Apply all needed corrections. Rules:

- Keep the existing section order and formatting style
- Only change what is factually wrong or missing — do not rewrite prose style
- For new exports: add them to the API Reference with a parameter table
- For removed exports: delete their section entirely (don't mark as deprecated unless the code does)
- For changed signatures: update the parameter table in-place
- For new example files: add an entry to `examples/README.md` matching the existing format

### Step 6 — Verify Consistency

After edits:

- Confirm all code snippets use import paths and function names that exist in `src/index.ts`
- Confirm the Tracked Methods list matches exactly the wrappers present in `src/wrappers/`
- Confirm `examples/README.md` has one entry per `.ts` file in `examples/`

## Quality Checklist

Before finishing, confirm:

- [ ] README Quick Start compiles against current exports
- [ ] API Reference matches current function signatures
- [ ] Tracked Methods list is exhaustive and accurate
- [ ] `examples/README.md` lists every example file with correct run commands
- [ ] No references to removed or renamed exports remain
- [ ] `package.json` description and keywords still describe what the package does
