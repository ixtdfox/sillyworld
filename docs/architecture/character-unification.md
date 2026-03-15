# Character unification foundation

This step introduces a class-based runtime model that keeps current game flows intact while creating a stable center for later movement/controller unification.

## Core model

- **World simulation remains cell-based.**
  - Exploration and combat can differ in presentation, but movement intent always targets cells.
- **Character is the runtime aggregate.**
  - `Character` owns identity, runtime location/health state, controller assignment, and relations.
  - `Character` intentionally does not own scene nodes or render objects so migration can happen without breaking scene runtime.
- **Control is separate from movement execution.**
  - `CharacterController` issues intents only.
  - `PlayerController` adapts user input into intents.
  - `AIController` adapts system behavior state into intents.
- **Hostility is relationship-derived, not a role.**
  - Identity uses `CharacterKind` (`player`, `npc`, `creature`).
  - Disposition (`friendly`, `neutral`, `hostile`) lives in `CharacterRelations` and can change at runtime.

## Migration strategy in this PR

1. Introduce class-based character-domain primitives:
   - `Character`
   - `CharacterController` + `PlayerController` + `AIController`
   - `CharacterRelations`
2. Keep exploration/combat controllers unchanged for playability.
3. Keep `PlayerState` persistence unchanged.
4. Add compatibility adapters that wrap the new classes for legacy call sites.

## Invariants for follow-up PRs

- `PlayerState` remains source-of-truth in persistence until a dedicated schema migration.
- New orchestration code should consume `Character` objects and controller-issued intents.
- Existing runtime modules continue to run until they are incrementally redirected to the shared character pipeline.
