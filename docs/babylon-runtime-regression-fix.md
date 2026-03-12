# Babylon runtime regression fix

## Regression introduced
Two separate regressions happened in sequence:
1. A DOM rewrite replaced the original Babylon phone screen architecture (incorrect fix).
2. The follow-up restoration pointed runtime to `/vendor/babylon/*`, but those files were not present in the app bundle, causing 404 and mount failure.

This patch keeps the original Babylon phone architecture and fixes the runtime source URLs to valid executable Babylon script endpoints.

## Why TypeScript passed while runtime failed
`tsc` validates types and module syntax only. Babylon loading here is runtime script injection and depends on URL availability/content. So compile-time can be green while runtime fails with `Failed to load script`.

## Phone/map path audited
- New Game transitions to map screen (`MapScreen`).
- `mountPhoneScene()` runs `await ensureBabylonRuntime()`.
- On success, `createBabylonUiRuntime(canvas)` mounts Babylon scene and GUI.
- `buildPhoneGui()` creates the atlas-based phone frame, display bounds, map viewport, and inventory switching.

## Loading strategy now
- Keep one coherent Babylon loader path (`ensureBabylonRuntime`) used by phone and world runtimes.
- Runtime script sources are now:
  - `https://cdn.babylonjs.com/babylon.js` (valid)
  - `https://cdn.babylonjs.com/gui/babylon.gui.min.js`
  - `https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js`
- Removed broken reference to `babylon.min.js` (404).
- Kept explicit diagnostics for bootstrap failures with attempted source list.

## Files changed
- `src/ui/rendering/babylonRuntime.ts`
  - fixed Babylon core URL to `babylon.js`
  - preserved loader sequencing and diagnostics
- `docs/babylon-runtime-regression-fix.md`
  - updated with actual regression chain and fix details

## Verification
- `npx tsc -p tsconfig.json` passes.
- New Game mounts the original Babylon phone canvas path.
- Phone frame / atlas-based layout is visible again.
- Runtime no longer fails with `/vendor/babylon/...` 404.
