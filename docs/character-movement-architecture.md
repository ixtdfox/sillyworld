# Character movement/runtime architecture (cleanup baseline)

This note captures the post-refactor runtime shape used by exploration and combat.

## Shared movement pipeline

- `CellMovementEngine` is the single path-following and world-position snapping implementation.
- `CharacterMovementOrchestrator` wraps the engine for exploration-style continuous updates.
- `CombatPlayerMovementRuntime` reuses the same engine for turn-based movement while adding combat-state checks, pointer gating, and MP spending.

## Controller split

- Domain characters provide intents through controllers:
  - `PlayerController` for player-input destinations.
  - `AIController` for patrol/ambient destinations.
- Runtime services own lifecycle (`attach`/`dispose`) and bridge controller intents to the movement engine.

## Character model

- `Character` is the gameplay aggregate for identity, relations, runtime cell/state, and controller.
- Scene-bound data (meshes, animation groups, spawn state) is isolated in `CharacterRuntime`.
- Player/NPC/enemy differences are represented as controller + relations + metadata, not separate movement foundations.

## Hostility derivation

- Hostility is derived from `CharacterRelations`/relationship state (`hostile`, `neutral`, `friendly`) and consumed by encounter/perception bindings.
- Combat triggers consume this derived hostility instead of hard-coded entity kind checks.

## Remaining technical debt

- `toCharacterRuntimeFromPlayerState` and `applyCharacterRuntimeToPlayerState` remain as persistence compatibility DTO shims.
- Several rendering/scene modules still run under `@ts-nocheck`; behavior is covered by tests but typing debt remains.
- Combat movement currently has a player-focused runtime service; enemy turn movement should eventually use the same runtime abstraction once combat AI turn execution is migrated.
