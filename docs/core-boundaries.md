# Core vs Platform Adapter Boundaries

This project now separates **platform-agnostic game logic** from **host-specific integration** so SillyTavern is only one adapter.

## What belongs in `src/core`

`src/core` is the neutral layer and should not depend on SillyTavern globals or DOM specifics.

- Application flow/state orchestration (`createAppController`)
  - screen transitions
  - map/scene navigation state
  - phase-presentation model derivation
- Navigation and transition state models (`core/navigation/*`)
- Asset metadata/constants (`core/assets/assetCatalog.js`)
- Any future pure domain logic that can run in tests or non-browser hosts

## What belongs in platform adapters

Platform adapters translate host/runtime capabilities into interfaces consumed by core logic.

- `src/platform/browser/localPersistence.js`
  - local persistence access (`localStorage`), save-existence checks
- `src/platform/sillytavern/seedLoader.js`
  - SillyTavern-aware seed URL/base resolution and fetch bootstrap
- `src/st_bridge/*` and `index.js`
  - SillyTavern host events, toolbar button wiring, chat integration
- `src/ui/mount.js`
  - DOM mounting/unmounting and host UI visibility toggling

## Interfaces to keep explicit

When adding features, keep these boundaries explicit by passing capabilities in:

- **Asset resolution**: pass `resolveAssetPath` into scene/character loaders instead of reading host globals directly.
- **Local persistence**: pass a persistence adapter (`storage`, `hasSaveData`) into app orchestration.
- **Application bootstrap**: host adapter decides when to call `openApp`/controller initialize.
- **DOM mounting**: UI adapter owns root creation and mount lifecycle.
- **External host events**: host adapter owns chat/toolbars/extension hooks and forwards intents to core.

## Practical rule of thumb

If logic can be executed unchanged in a future standalone shell (web app, Electron, tests), place it in `src/core`. If it touches host APIs (SillyTavern globals, toolbar DOM anchors, extension base URL assumptions), keep it in adapters.
