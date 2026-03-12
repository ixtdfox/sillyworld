# Standalone Structure Migration

This repository was previously arranged for SillyTavern extension packaging. It is now structured as a normal standalone web application.

## What was removed

The following extension-only concepts were removed:

1. **SillyTavern extension manifest packaging**
   - Removed `manifest.json`.
   - Build/runtime is now driven by standard Vite web app conventions (`index.html`, npm scripts).

2. **Extension entrypoint and toolbar injection flow**
   - Removed `index.js` extension bootstrap.
   - No more host toolbar probing or drawer button injection.
   - Startup now always flows through `src/standalone.js`.

3. **Extension base URL global (`window.__SILLYRPG__.EXT_BASE`)**
   - Removed global base-url contract used by extension runtime.
   - Asset and seed resolution now uses browser-native URL resolution from module/runtime location.

4. **SillyTavern bridge namespace**
   - Removed `src/st_bridge/*` and SillyTavern API coupling code.
   - UI asset references now use `src/platform/browser/assetResolver.js`.

5. **SillyTavern-specific seed loader adapter**
   - Removed `src/platform/sillytavern/seedLoader.js`.
   - Added `src/platform/browser/seedLoader.js`.

## New standalone-oriented structure

- `index.html`
  - Standard web app shell with an `#app` mount point.
- `src/standalone.js`
  - Browser bootstrap entrypoint for app startup.
- `src/app.js`
  - Orchestrates runtime state/screens, independent of extension packaging.
- `src/platform/browser/`
  - Browser adapters:
    - `assetResolver.js`
    - `localPersistence.js`
    - `seedLoader.js`
- `src/core/`, `src/world/`, `src/ui/`
  - Existing game/application layers retained; only packaging/platform assumptions changed.

## Developer impact

- Run as a normal web app (`npm run dev`, `npm run build`, `npm run preview`).
- No extension installation workflow is required.
- Repository naming and docs now describe standalone operation first.
