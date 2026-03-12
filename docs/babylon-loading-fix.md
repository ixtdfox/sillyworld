# Babylon runtime loading fix (standalone)

Standalone scene startup now loads Babylon from executable JavaScript CDN bundles (`.js`) instead of TypeScript source (`.ts`).

- Updated runtime script URLs in `src/ui/rendering/babylonRuntime.ts` to:
  - `https://cdn.babylonjs.com/babylon.js`
  - `https://cdn.babylonjs.com/gui/babylon.gui.min.js`
  - `https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js`
- The app keeps a single loading strategy: dynamic script-tag injection that initializes the global `window.BABYLON` namespace before scene/runtime creation.
- This removes the broken standalone path that requested `https://cdn.babylonjs.com/babylon.ts` and could leave a blank scene screen after New Game.
