# Startup Debug Report

## Root cause
The standalone bootstrap was loading seed data from an invalid relative path in `src/platform/browser/seedLoader.js`.

- Previous default path: `../world/seed_world.json`
- `seedLoader.js` lives in `src/platform/browser`, so that path resolved to `src/platform/world/seed_world.json` (non-existent).
- The fetch failed, `appController.initialize()` rejected, and startup rendering never executed.

## Why the page was blank
Two startup behaviors combined to create a silent black/blank page:

1. `startApp()` showed the root container immediately.
2. Initialization failure was silently swallowed with `.catch(() => {})`.

Because no render occurred after initialization failure, the app displayed only background styling with an empty root node and no visible UI.

## Fix implemented
1. Corrected the seed path to `../../world/seed_world.json` so startup can load the world seed in standalone mode.
2. Added focused startup logs at key boundaries:
   - standalone bootstrap entry
   - root mount
   - seed load start/complete
   - startup complete/failure
3. Removed silent startup error swallowing in `startApp()` so initialization failures surface clearly via `console.error` and a rejected promise.
4. Removed swallowed promise catches from main-menu start/continue handlers so user-triggered startup flows also surface errors.

## Files changed
- `src/platform/browser/seedLoader.js`
- `src/standalone.js`
- `src/app.js`

## Validation
- Confirmed in browser automation that startup now loads seed from `http://127.0.0.1:4173/src/world/seed_world.json`.
- Confirmed the app mounts visible UI (`.sillyrpg-panel` present) instead of staying blank.
- Ran full test suite successfully.
