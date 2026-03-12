# Sillyworld (Standalone Web App)

Sillyworld is a lightweight, menu-driven RPG web application built with Vite.

## Quick start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open the local URL printed by Vite (typically `http://localhost:5173`).

## Scripts

- `npm run dev` / `npm start`: start local dev server
- `npm run build`: build production assets into `dist/`
- `npm run preview`: preview production build
- `npm test`: run Node test suite

## Project layout

- `index.html`: standalone HTML shell with `#app` mount
- `src/standalone.js`: web bootstrap entrypoint
- `src/app.js`: app orchestration and screen flow
- `src/platform/browser/*`: browser-specific adapters (assets, persistence, seed loading)
- `src/core/*`: app/core logic isolated from host environment assumptions
- `src/world/*`: world state, actions, selectors, and seed data

See `docs/standalone-structure.md` for the full packaging migration notes.
