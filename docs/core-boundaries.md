# Core vs Platform Adapter Boundaries

This project separates **platform-agnostic game logic** from **browser/runtime adapters** for standalone execution.

## What belongs in `src/core`

`src/core` is the neutral layer and should not depend on browser globals beyond explicit inputs.

- Application flow/state orchestration (`createAppController`)
- Navigation and transition state models (`core/navigation/*`)
- Asset metadata/constants (`core/assets/assetCatalog.js`)
- Domain logic that should run unchanged in tests

## What belongs in platform adapters

Platform adapters translate runtime capabilities into interfaces consumed by core/UI layers.

- `src/platform/browser/localPersistence.js`
  - local save persistence (`localStorage`)
- `src/platform/browser/seedLoader.js`
  - fetch bootstrap for seed world data
- `src/platform/browser/assetResolver.js`
  - runtime-safe URL resolution for static assets
- `src/ui/mount.js`
  - DOM mounting/unmount lifecycle

## Interfaces to keep explicit

When adding features, keep these boundaries explicit by passing capabilities in:

- **Asset resolution**: pass `resolveAssetPath` into scene/character loaders.
- **Local persistence**: inject persistence adapters into app orchestration.
- **Application bootstrap**: `src/standalone.js` is responsible for startup timing.
- **DOM mounting**: UI adapter owns root creation and mount lifecycle.

## Rule of thumb

If logic can execute unchanged in tests or another host shell, place it in `src/core`. If it touches runtime APIs (`window`, DOM mount points, storage, fetch/bootstrap paths), keep it in `src/platform` or `src/ui` adapters.
