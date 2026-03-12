# Architecture Overview

This document describes the current standalone app architecture in the codebase today.

## 1) High-level app structure

- `src/standalone.js`: browser entrypoint; starts app on `DOMContentLoaded`.
- `src/app.js`: top-level UI composition and screen routing (`mainMenu`, `map`, `scene`, `settings`).
- `src/core/*`: app orchestration and navigation state (`createAppController`, navigation store, scene transition controller).
- `src/world/*`: game state model, actions, selectors, migrations, and save/load helpers.
- `src/platform/browser/*`: browser adapters (asset URL resolving, seed loading, local persistence).
- `src/ui/*`: DOM screens and Babylon runtimes for map/scene/combat.

## 2) Core vs platform/infrastructure boundaries

- **Core/domain (`src/core`, `src/world`)**
  - Holds app flow decisions and game state logic.
  - Should stay mostly platform-agnostic and testable.
- **Platform/infrastructure (`src/platform/browser`, parts of `src/ui`)**
  - Owns browser APIs (`fetch`, `localStorage`, `document.baseURI`, script injection for Babylon, DOM mount lifecycle).
- **Boundary rule in practice**
  - Core is constructed with injected capabilities (`loadSeed`, `persistence`, `onStateChange`) from `src/app.js`.

## 3) App bootstrap flow

1. `index.html` loads `src/standalone.js`.
2. `standalone.js` waits for DOM readiness, then calls `startApp()`.
3. `startApp()` shows the root and calls `appController.initialize()`.
4. `initialize()` loads seed data once (via `seedLoader`) and triggers first render.
5. Screen actions (`New Game`, `Continue`, map region clicks, back navigation) call methods on `createAppController`, which updates navigation/world state and re-renders.

## 4) Asset loading flow

1. Asset paths are defined centrally in `src/core/assets/assetCatalog.js`.
2. UI/runtime modules request assets by catalog key or relative path.
3. `src/platform/browser/assetResolver.js` converts paths to absolute URLs using `document.baseURI` (with safe fallbacks).
4. Babylon scene/character loaders consume resolved URLs when importing GLB assets.

## 5) Persistence approach

- Persistence adapter: `createStandalonePersistence()` in `src/platform/browser/localPersistence.js`.
- Primary storage: browser `localStorage`; fallback: in-memory storage if unavailable.
- Save key: `sillyrpg.save.v4`.
- `worldStore.save()`/`worldStore.load()` use `src/world/worldPersistence.js` for JSON serialization/deserialization + migration (`worldMigrations`).
- Current save points in app flow: new game start and phase-transition consumption.

## 6) Main UI/screen modules

- `src/app.js`: decides which screen to render from navigation state.
- `src/ui/screens/mainMenu.js`: new/load/settings entry actions.
- `src/ui/screens/phoneMap/phoneCityMapScreen.js`: Babylon GUI “phone” map/inventory screen.
- `src/ui/screens/phaseTransitionInterstitial.js`: modal-like transition screen between time phases.
- `src/ui/screens/sceneViewScreen.js`: 3D district scene wrapper and debug overlay.

## 7) Scene loading and player movement responsibilities

- `sceneRuntime.js` is the orchestrator:
  - boots Babylon runtime,
  - sets up exploration runtime,
  - switches exploration <-> combat,
  - wires debug updates.
- `districtExplorationRuntime.js` composes exploration scene parts (world scene + player + enemy entities).
- `worldSceneLoader.js` imports the district GLB and resolves the ground mesh.
- Movement/input split:
  - `sceneGroundClickInput.js`: picks valid ground clicks and sets move targets.
  - `playerMovementController.js`: per-frame movement toward target + stop behavior.
  - `playerAnimationController.js`: reacts to moving/idle state.
  - `encounterInteractionInput.js`: enemy click proximity check and combat trigger.

## 8) Where future features should be added

- **New game rules/state changes**: add in `src/world/actions`, `src/world/selectors`, and seed/migrations as needed.
- **App flow and navigation behaviors**: add in `src/core/app` and `src/core/navigation`.
- **Browser/runtime integrations** (storage/asset/bootstrap differences): add adapters under `src/platform/browser`.
- **New screens or UI widgets**: add under `src/ui/screens` and `src/ui/components`.
- **3D exploration/combat behaviors**: extend `src/ui/rendering/*` modules, keeping orchestration in `sceneRuntime.js` and logic focused in specialized controllers.

Practical rule: if it depends on browser/runtime APIs, keep it in platform/UI layers; if it expresses game/app logic, keep it in core/world.
