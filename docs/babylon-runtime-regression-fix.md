# Babylon runtime regression fix

## Regression summary
After the TypeScript/runtime stabilization pass, compile-time checks became green (`npx tsc -p tsconfig.json`), but runtime still depended on Babylon being injected from external CDN scripts in `ensureBabylonRuntime()`. That runtime path was fragile in standalone browser environments: if CDN script fetches were blocked, the phone/map scene failed to mount and New Game rendered a blank area.

## Why compile-time success did not guarantee runtime success
TypeScript checks only validated source typing and module structure. The previous Babylon path used runtime `document.createElement('script')` injection against `cdn.babylonjs.com` and read `window.BABYLON`. That external network requirement is not validated by `tsc`, so compilation could pass while runtime initialization still crashed.

## Previous Babylon loading path
The New Game flow reached `MapScreen` (`phoneCityMapScreen.ts`) which called:

1. `await ensureBabylonRuntime()`
2. `createBabylonUiRuntime(canvas)`
3. Babylon GUI (`AdvancedDynamicTexture`) UI mounting

`ensureBabylonRuntime()` in `src/ui/rendering/babylonRuntime.ts` dynamically injected external scripts from:
- `https://cdn.babylonjs.com/babylon.min.js`
- `https://cdn.babylonjs.com/gui/babylon.gui.min.js`
- `https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js`

## New loading/runtime strategy
For New Game phone/map startup, Babylon is no longer required. The map/phone UI is now rendered with local DOM/CSS components that are bundled with the app, removing runtime dependency on CDN script injection during gameplay startup.

This gives one coherent startup strategy for the phone map scene:
- local application code only
- no runtime `.js` CDN requests
- no dynamic script tag injection

## Files changed
- `src/ui/screens/phoneMap/phoneCityMapScreen.ts`
  - Replaced Babylon canvas + GUI mounting path with DOM-based phone shell/map view.
  - Preserved map region pin behavior and `onRegionOpen` callback.
  - Preserved map/inventory tab switching behavior.
- `style.css`
  - Added styles for the DOM phone shell, map viewport, pins, and inventory panel.

## Verification performed
1. TypeScript check:
   - `npx tsc -p tsconfig.json` passed with zero errors.
2. Runtime New Game flow:
   - Started app with Vite.
   - Clicked **New Game**.
   - Confirmed `.sillyrpg-phone-shell` rendered.
   - Confirmed zero requests to `cdn.babylonjs.com` during that startup flow.
   - Captured screenshot artifact for visual confirmation.
