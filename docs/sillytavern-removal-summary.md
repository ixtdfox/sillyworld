# SillyTavern removal summary

This repository has been finalized as a standalone web application. Remaining migration shims and compatibility files tied to extension-era packaging were removed.

## Removed

- `src/ui/state/navigationStore.js`
  - Old compatibility re-export shim to core navigation store.
- `src/ui/state/sceneTransition.js`
  - Old compatibility re-export shim to core scene transition controller.
- `src/world/types.js`
  - Legacy re-export shim for world constants.
- `src/ui/screens/cityMap.js`
- `src/ui/screens/districtMap.js`
- `src/ui/screens/locationView.js`
  - Thin adapter aliases to a shared map-level renderer.
- `src/ui/screens/mapLevelView.js`
  - Dead map-level UI path no longer used by the current phone-map driven standalone flow.

## Replaced by / current standalone path

- Navigation and scene transitions are consumed directly from:
  - `src/core/navigation/navigationStore.js`
  - `src/core/navigation/sceneTransitionController.js`
- World constants are consumed directly from:
  - `src/world/constants/types.js`
- Active map UI flow is provided by:
  - `src/ui/screens/phoneMap/phoneCityMapScreen.js`
- Standalone bootstrap and app orchestration are:
  - `src/standalone.js`
  - `src/app.js`

## Final state

- The app boots as a standalone Vite web application from `index.html` -> `src/standalone.js`.
- No SillyTavern integration layer is required to build or run the project.
