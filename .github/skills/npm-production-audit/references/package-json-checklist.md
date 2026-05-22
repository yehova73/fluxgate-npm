# package.json Production Checklist

Complete field-by-field reference for auditing an npm package's `package.json`.

---

## Required Fields (🔴 Blocker if missing or wrong)

| Field              | Valid example             | Common mistake                                         |
| ------------------ | ------------------------- | ------------------------------------------------------ |
| `name`             | `"@fluxgate/openai"`      | Typo, wrong scope, spaces in name                      |
| `version`          | `"1.0.0"`                 | `"0.0.0"`, `"1.0.0-alpha"` without prerelease tag      |
| `main`             | `"dist/index.js"`         | Points to `src/` (TypeScript source, not compiled)     |
| `types`            | `"dist/index.d.ts"`       | Missing entirely, or points to `.ts` not `.d.ts`       |
| `exports`          | See below                 | Missing → Node `require`/`import` resolution breaks    |
| `files`            | `["dist", "README.md"]`   | Missing → entire repo incl. tests, `.env` is published |
| `license`          | `"MIT"`                   | Missing, `"UNLICENSED"` unintentionally                |
| `peerDependencies` | `{ "openai": ">=4.0.0" }` | SDK is in `dependencies` instead — bundles the SDK     |

### Minimal `exports` map

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/index.d.ts"
  }
}
```

If CJS output is not built, omit `require`. If only ESM: `"import"` only.

---

## Important Fields (🟡 Should fix)

| Field           | Why                                                 |
| --------------- | --------------------------------------------------- |
| `description`   | Shown on npmjs.com search; helps discoverability    |
| `keywords`      | Powers npm search ranking                           |
| `author`        | Required for legal attribution                      |
| `repository`    | Links npm page → GitHub; required for provenance    |
| `bugs`          | Users need somewhere to report issues               |
| `homepage`      | Linked from npm page                                |
| `engines`       | Prevents installation on incompatible Node versions |
| `sideEffects`   | `false` enables tree-shaking in bundlers            |
| `publishConfig` | Scoped packages need `{ "access": "public" }`       |

---

## Scripts to Validate

| Script           | Expected               | Missing means                          |
| ---------------- | ---------------------- | -------------------------------------- |
| `build`          | Compiles TS to `dist/` | Users can't rebuild; CI can't verify   |
| `test`           | Runs test suite        | `npm test` fails out of the box        |
| `lint`           | ESLint / Biome         | No automated style enforcement         |
| `prepublishOnly` | Runs `build` + `test`  | Publishing without building or testing |

---

## Dependency Hygiene

- **`dependencies`**: Only runtime deps — things your code `import`s at runtime
- **`devDependencies`**: TypeScript, test runners, linters, bundlers, type packages (`@types/*`)
- **`peerDependencies`**: The SDK being wrapped (`openai`, `@anthropic-ai/sdk`, etc.)
- **`peerDependenciesMeta`**: Mark optional peers with `{ "optional": true }`

### Common mistakes

| Package                 | Should be in       | Often found in |
| ----------------------- | ------------------ | -------------- |
| `typescript`            | `devDependencies`  | `dependencies` |
| `@types/*`              | `devDependencies`  | `dependencies` |
| `vitest` / `jest`       | `devDependencies`  | `dependencies` |
| `openai` (in a wrapper) | `peerDependencies` | `dependencies` |
| `tsup` / `esbuild`      | `devDependencies`  | `dependencies` |

---

## Files Field Reference

The `files` array is a whitelist. Only listed paths are included in the published package.

Recommended minimum:

```json
"files": [
  "dist",
  "README.md",
  "LICENSE"
]
```

Files always excluded by npm (even without `files`): `.git`, `node_modules`, `.npmrc`, `.env`.

Files that are **included by default** (risky if you have no `files` field):

- All source files including `src/`, tests, example scripts, config files, local `.env` files

---

## Version Patterns

| Pattern     | Meaning                 | Use in peerDeps?             |
| ----------- | ----------------------- | ---------------------------- |
| `">=4.0.0"` | 4.x and up              | ✅ Yes — most flexible       |
| `"^4.0.0"`  | 4.x only                | ✅ OK — common               |
| `"*"`       | Any version             | ❌ No — too loose            |
| `"latest"`  | Invalid in package.json | ❌ Never                     |
| `"4.0.0"`   | Exact pin               | ❌ No — too strict for peers |
