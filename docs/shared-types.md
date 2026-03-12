# Shared types

This project now has a small shared type surface in `src/shared/types.ts` to describe cross-layer contracts that were previously represented as loose objects.

## Introduced shared types

## Navigation and screen types

- `ScreenId`: app-level screens (`mainMenu`, `map`, `scene`, `settings`)
- `MapLevelId`: map hierarchy level identifiers (`global`, `region`, `city`, `district`, `building`, `room`)
- `NavigationStackEntry`: one level/context pair in back navigation history
- `NavigationState`: full navigation state used by `createNavigationStore`
- `ContextId`: common context identifier type used by navigation and scene transitions

## App and orchestration contracts

- `AppController`: public contract returned by `createAppController`
- `AppControllerDeps`: dependency contract accepted by `createAppController`
- `SceneTransitionController`: public scene transition contract used by app/UI orchestration

## Persistence and seed loading contracts

- `PersistenceStorage`: minimal storage surface (`getItem` / `setItem` / `removeItem`)
- `PersistenceKeys`: persistence key bag shape
- `PersistenceContract`: persistence object used by app controller
- `WorldSeed`: current flexible seed model (`Record<string, unknown>`)
- `SeedLoader`: async seed loading function contract

## Phase presentation model

- `TimePhaseId`: known phase ids (`morning`, `day`, `evening`, `night`)
- `PhasePresentation`: shape returned by `getPhasePresentation`

## Common ID aliases

- `CityId`, `RegionId`, `DistrictId`, `LocationId`, `BuildingId`, `RoomId`
- These are currently string aliases used to make boundary contracts readable without forcing branded IDs yet.

## Which modules should depend on shared types

Shared types should be used at module boundaries where data crosses layers:

- `src/core/app/createAppController.js` for app controller inputs/outputs and phase presentation
- `src/core/navigation/navigationStore.js` for navigation state and methods
- `src/platform/browser/seedLoader.js` for seed-loading contract
- `src/platform/browser/localPersistence.js` for persistence contract
- `src/app.js` for top-level orchestration callbacks (region/screen identifiers)

`src/world` remains the source of gameplay/domain state and constants; shared types should describe the boundary into and out of world APIs, not replace internal world implementation shapes immediately.

## Areas to strengthen later

- Replace `WorldStore.getState(): any` with explicit world-state interfaces and selector return types.
- Split current string ID aliases into stronger branded types once ID creation/parsing is centralized.
- Type pending phase transition payloads (`unknown[]`) with a stable transition interface.
- Add typed contracts for screen-specific UI props (map screen, scene view, top bar) as migration expands.
- Align `MapLevelId` with `MAP_LEVEL` constants through shared literal source to avoid duplication.
