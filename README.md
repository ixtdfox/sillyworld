# Sillyworld

Sillyworld is a standalone browser RPG application built with Vite. It runs as a normal web app with no SillyTavern extension runtime, bridge API, or host integration requirements.

## What it is

- A menu-driven RPG with map navigation, scene exploration, combat runtime hooks, inventory UI, and world state progression.
- A client-side app that loads seed world data and persists saves locally in the browser.

## How to run it

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development mode:
   ```bash
   npm run dev
   ```
3. Open the Vite URL shown in the terminal (default: `http://localhost:5173`).

Production flow:

- Build: `npm run build`
- Preview built output: `npm run preview`
- Test suite: `npm test`

## Assets organization

- Runtime assets live in `assets/`.
- Scene/map placeholders are organized by domain subfolders (for example `assets/city/`, `assets/districts/`, `assets/locations/`, `assets/npcs/`).
- Asset path resolution is handled by `src/platform/browser/assetResolver.ts`.

## Application entrypoint

- HTML shell: `index.html`
- TypeScript bootstrap entrypoint: `src/standalone.ts`
- App orchestration root: `src/app.ts`

## Project structure (high level)

- `src/core/*`: app-core orchestration and navigation logic
- `src/platform/browser/*`: browser adapters (persistence, assets, seed loading)
- `src/ui/*`: UI composition, screens, and rendering/runtime modules
- `src/world/*`: world data model, actions, selectors, and persistence/migrations

See also: `docs/standalone-run.md`, `docs/assets.md`, `docs/sillytavern-removal-summary.md`, and `docs/final-typescript-state.md`.
