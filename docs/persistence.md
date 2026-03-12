# Persistence (Standalone Mode)

This project now uses a standalone browser persistence adapter rather than any host-runtime-specific storage bridge.

## Storage adapter

- **Module:** `src/platform/browser/localPersistence.js`
- **Factory:** `createStandalonePersistence()`
- **Default backend:** `window.localStorage` (when writable)
- **Fallback backend:** in-memory Map-backed storage (used automatically when `localStorage` is unavailable or blocked)

## Storage keys

| Key | Purpose | Written by | Read by |
| --- | --- | --- | --- |
| `sillyrpg.save.v4` | Serialized world save state snapshot for Continue/Load Game flows. | `saveGameState()` via `createAppController` save points (new game start and phase-transition consumption). | `hasSaveData()` and `loadGameState()` during app resume. |

## Behavior notes

- Save payloads are JSON serialized via `serializeGameState` and migrated on load via `migrateGameState`.
- Persistence operations are wrapped defensively; failures degrade gracefully (no throw to UI flow).
- No backend service is required.
