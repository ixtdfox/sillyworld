# TypeScript migration plan

## What was added

- Added `typescript` as a development dependency.
- Added a root `tsconfig.json` so the project can type-check both JavaScript and TypeScript files during migration.
- Kept Vite runtime/build behavior unchanged (no Vite config changes were required for this setup).

## Migration mode enabled

The repository is configured for **incremental migration**:

- `allowJs: true` keeps existing `.js` files working while allowing new `.ts`/`.tsx` files.
- `checkJs: false` avoids enforcing TypeScript diagnostics on all existing JavaScript files immediately.
- `strict: false` starts with a lenient baseline and avoids broad breakage early in migration.
- `noEmit: true` keeps TypeScript as a checker only; Vite remains the build/runtime pipeline.

## Browser adapter migration status

The browser platform adapter layer has now been migrated to TypeScript:

- `src/platform/browser/assetResolver.ts`
- `src/platform/browser/localPersistence.ts`
- `src/platform/browser/seedLoader.ts`

Status highlights:

- Added explicit adapter contracts for browser asset path resolution and preserved the existing URL fallback behavior.
- Added typed persistence configuration, key contracts, and explicit localStorage-to-memory fallback resolution semantics.
- Added typed seed-loading request/result helpers while keeping the public `loadSeed` runtime behavior unchanged.
- Updated import sites (including tests) to consume the new `.ts` adapter modules directly.

## Recommended next steps

1. Start converting leaf modules (utility/domain files with fewer dependencies) from `.js` to `.ts`.
2. Add explicit types at public boundaries first (module exports, app orchestration interfaces, world/core contracts).
3. Introduce `checkJs: true` selectively by folder over time (or per-file via `// @ts-check`) once hot spots are stabilized.
4. Gradually tighten compiler checks (e.g., turn on stricter options per milestone).
5. Add a CI `typecheck` step (`tsc --noEmit`) when enough of the codebase has useful type coverage.

## Rendering/runtime migration status (latest)

The scene rendering/runtime boundary has now been migrated to TypeScript with explicit shared contracts:

- `src/ui/rendering/runtimeContracts.ts`
- `src/ui/rendering/sceneRuntime.ts`
- `src/ui/rendering/encounterInteractionInput.ts`
- `src/ui/rendering/districtExplorationRuntime.ts`
- `src/ui/rendering/babylonRuntime.ts`
- `src/ui/screens/sceneViewScreen.ts`

### Migration risks

- Babylon.js remains a global runtime loaded from CDN, so several Babylon-facing APIs are currently represented with minimal structural interfaces rather than full engine typings.
- Combat internals are still implemented in JavaScript; `sceneRuntime` intentionally types only the stable combat-state surface used by the scene screen/debug overlay.
- Some scene/entity loader return shapes are still inferred via narrow local interfaces, which is safe at the boundary but can hide drift if loader internals change without updating contracts.

### Remaining work

1. Migrate `src/ui/rendering/combatRuntime.js` and related combat helper modules to TypeScript so combat state/action types are first-class across the runtime.
2. Add a Babylon ambient type package or local Babylon d.ts surface to replace temporary structural engine typings.
3. Extend explicit contracts for world/entity loader outputs (character roots, scene containers, gameplay dimensions) to remove boundary casts.
4. Gradually enable stricter compiler options for rendering/runtime folders once combat and loader contracts are fully typed.
