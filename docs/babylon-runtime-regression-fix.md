# Babylon runtime regression fix

## Regression introduced by previous patch
The prior patch incorrectly solved the runtime problem by replacing the phone/map screen with a plain DOM/CSS screen. That removed the in-game phone shell/frame and bypassed the original Babylon GUI/canvas architecture.

This follow-up restores the original phone UI path and limits changes to Babylon runtime loading/integration.

## Why compile-time success did not guarantee runtime success
`npx tsc -p tsconfig.json` only validates static typing and module correctness. The runtime regression occurred in dynamic script loading (`document.createElement('script')`) where Babylon was fetched from external CDN URLs. Those requests are runtime network operations and are not validated by TypeScript.

## Original Babylon load path (before this fix)
- New Game → map screen mount (`MapScreen`) → `mountPhoneScene`
- `mountPhoneScene` calls `ensureBabylonRuntime()`
- `ensureBabylonRuntime()` dynamically injected:
  - `https://cdn.babylonjs.com/babylon.min.js`
  - `https://cdn.babylonjs.com/gui/babylon.gui.min.js`
  - `https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js`

That external dependency was fragile and could fail/blocked in standalone environments.

## Loading strategy now
- The original Babylon/canvas/GUI architecture is restored for the phone screen.
- Babylon bootstrap now points to local bundled asset paths:
  - `/vendor/babylon/babylon.min.js`
  - `/vendor/babylon/babylon.gui.min.js`
  - `/vendor/babylon/babylonjs.loaders.min.js`
- Startup diagnostics were kept explicit, including a concise log of attempted runtime sources and bootstrap failure context.

This removes gameplay startup dependency on remote `cdn.babylonjs.com` script injection.

## Files changed
- `src/ui/screens/phoneMap/phoneCityMapScreen.ts`
  - Restored original Babylon GUI phone architecture (phone frame atlas, display bounds, map/inventory internal switching, canvas mount path).
- `src/ui/rendering/babylonRuntime.ts`
  - Replaced external CDN script sources with local bundled runtime paths.
  - Kept loader sequencing and improved runtime diagnostics.
- `style.css`
  - Removed incorrect DOM-rewrite style additions used by the replacement phone UI.

## New Game flow verification checklist
- New Game button click
- map screen transition
- phone/map screen mount through Babylon canvas path
- Babylon runtime bootstrap via local source list
- visible phone-style scene render (phone frame + display area + map viewport)
- no runtime request to `cdn.babylonjs.com` during gameplay startup
