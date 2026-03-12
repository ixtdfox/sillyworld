# Final TypeScript State

## Migration completion confirmation

The application source tree is now TypeScript-only:

- `src/**/*.js` has been fully eliminated.
- local declaration shims (`.d.ts`) previously used to model neighboring JavaScript modules are no longer present in the repository.
- application source files are now authored as `.ts` (and `.tsx` if introduced later for UI components).

This means source code editing, review, and type-analysis now happen in a single language across core, world, platform, and UI/runtime layers.

## Intentional non-TypeScript files

The following non-TS files remain intentionally:

- `index.html` and `style.css`: web shell and global styles.
- `assets/**`: static game assets (images, meshes, placeholders, source art files).
- `src/world/seed_world.json`: world seed data.
- `tests/*.test.mjs`: Node test entry files retained as ESM test runners.
- project/config docs (`README.md`, `docs/**`, `package.json`, `tsconfig.json`): documentation and tooling metadata.

JavaScript files are now expected only as generated output (for example Vite build artifacts in `dist/`) and never as hand-authored application source.

## Final class-based architecture overview

The runtime architecture is centered around class-based orchestration with typed contracts:

- `AppController` coordinates lifecycle and top-level flow control.
- `NavigationController` encapsulates map-level navigation transitions and routing decisions.
- `SceneTransitionController` isolates scene enter/exit transition behavior.
- Screen-level classes (for example `MainMenuScreen`, `MapScreen`, `SceneViewScreen`) encapsulate mount/update/dispose behavior for each UI mode.

Supporting modules remain function-focused where that is a better fit (selectors, reducers/actions, rendering helpers), but they are now uniformly TypeScript modules and typed through shared contracts in `src/shared/types.ts` and `src/world/contracts.ts`.

## File conventions going forward

- New application modules should be created as `.ts` (or `.tsx` for JSX/TSX UI code).
- Cross-module imports should use explicit `.ts` extension specifiers.
- Do not add new handwritten `.js` source files under `src/`.
- If JavaScript is needed, it should come only from build artifacts produced by `npm run build`.
