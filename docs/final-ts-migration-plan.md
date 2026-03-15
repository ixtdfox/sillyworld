# Final TypeScript-Only Migration Plan

## Goal
Move the repository from mixed JavaScript/TypeScript to a **TypeScript-only source architecture** while improving object-oriented boundaries.

This plan is intentionally scoped to migration sequencing and architecture decisions (no large runtime rewrites yet).

## 1) Repository audit

### 1.1 Remaining `.js` source files
Current `src/` JavaScript count: **71 files**.

#### A) JavaScript files that already have `.ts` twins (compatibility shims / duplicate surfaces)
These should be removed once all imports are switched to TS module paths and tests pass:

- `src/platform/browser/assetResolver.js`
- `src/platform/browser/localPersistence.js`
- `src/platform/browser/seedLoader.js`
- `src/ui/rendering/babylonRuntime.js`
- `src/ui/rendering/districtExplorationRuntime.js`
- `src/ui/rendering/encounterInteractionInput.js`
- `src/ui/rendering/sceneRuntime.js`
- `src/ui/screens/sceneViewScreen.js`
- `src/world/actions/inventoryActions.js`
- `src/world/actions/navigationActions.js`
- `src/world/actions/phaseTransitionActions.js`
- `src/world/actions/relationshipActions.js`
- `src/world/actions/timeActions.js`
- `src/world/selectors/inventorySelectors.js`
- `src/world/selectors/locationAvailabilitySelectors.js`
- `src/world/selectors/mapSelectors.js`
- `src/world/selectors/npcAvailabilitySelectors.js`
- `src/world/selectors/relationshipSelectors.js`
- `src/world/selectors/settingSelectors.js`
- `src/world/selectors/worldSelectors.js`

#### B) JavaScript-only world/domain layer
- `src/world/index.js`
- `src/world/worldStore.js`
- `src/world/worldState.js`
- `src/world/worldPersistence.js`
- `src/world/worldMigrations.js`
- `src/world/constants/types.js`
- `src/world/utils/object.js`
- `src/world/entities/characters.js`
- `src/world/entities/items.js`
- `src/world/entities/maps.js`
- `src/world/entities/player.js`
- `src/world/entities/setting.js`
- `src/world/entities/world.js`
- `src/world/actions/restActions.js`

#### C) JavaScript-only rendering/runtime layer
- `src/ui/rendering/combatRuntime.js`
- `src/ui/rendering/combatTurnManager.js`
- `src/ui/rendering/combatActionResolver.js`
- `src/ui/rendering/combatAttackInputController.js`
- `src/ui/rendering/combatTargetSelectionFlow.js`
- `src/ui/rendering/combatPlayerMovementController.js`
- `src/ui/rendering/playerMovementController.js`
- `src/ui/rendering/playerActionModeStateMachine.js`
- `src/ui/rendering/gameplayCameraController.js`
- `src/ui/rendering/playerAnimationController.js`
- `src/ui/rendering/sceneGroundClickInput.js`
- `src/ui/rendering/encounterInteractionInput.js` (has TS twin, but JS still present)
- `src/ui/rendering/worldSceneLoader.js`
- `src/ui/rendering/playerCharacterLoader.js`
- `src/ui/rendering/enemyCharacterLoader.js`
- `src/ui/rendering/entityCharacterLoader.js`
- `src/ui/rendering/entityArchetypes.js`
- `src/ui/rendering/entityNormalization.js`
- `src/ui/rendering/entityNormalizationConfig.js`
- `src/ui/rendering/entityVisualBounds.js`
- `src/ui/rendering/entityGameplayDimensions.js`
- `src/ui/rendering/playerSpawn.js`
- `src/ui/rendering/movementTargetState.js`
- `src/ui/rendering/combatGrid.js`
- `src/ui/rendering/combatGridConfig.js`
- `src/ui/rendering/combatGridMapper.js`
- `src/ui/rendering/combatGridOverlayRenderer.js`
- `src/ui/rendering/combatMovementRangeHighlighter.js`
- `src/ui/rendering/combatDebugHud.js`
- `src/ui/rendering/combatDebugShell.js`

#### D) JavaScript-only UI/config layer
- `src/ui/components/interactiveAtlasButton.js`
- `src/ui/screens/phoneMap/phoneDisplayLayout.js`
- `src/ui/screens/phoneMap/phoneSpriteAtlas.js`
- `src/ui/screens/phoneMap/inventory/inventoryConfig.js`
- `src/ui/screens/phoneMap/inventory/inventoryGridView.js`
- `src/ui/screens/phoneMap/inventory/inventoryScreen.js`
- `src/ui/screens/phoneMap/inventory/inventoryScrollbar.js`

#### E) JavaScript-only core catalog
- `src/core/assets/assetCatalog.js`

---

### 1.2 `.d.ts` files that only describe local JS modules
These declaration files exist to type JS implementations and should be deleted after their corresponding implementations are migrated to TS and imported directly.

- `src/world/index.d.ts` (describes `src/world/index.js`)
- `src/world/worldStore.d.ts` (describes `src/world/worldStore.js`)
- `src/world/worldPersistence.d.ts` (describes `src/world/worldPersistence.js`)
- `src/world/worldState.d.ts` (describes `src/world/worldState.js`)
- `src/world/constants/types.d.ts` (describes `src/world/constants/types.js`)

---

### 1.3 Module shape recommendations (class vs functional)

#### Should become classes (OOP)

1. **Controllers / input orchestration**
   - `combatAttackInputController`
   - `sceneGroundClickInput`
   - `encounterInteractionInput`
   - `combatPlayerMovementController`
   - `playerMovementController`
   - `gameplayCameraController`

2. **Runtime coordinators**
   - `combatRuntime`
   - `sceneRuntime`
   - `districtExplorationRuntime`
   - `babylonRuntime` (adapter/facade class)

3. **Stateful stores/services**
   - `worldStore` (class owning world state + mutation methods)
   - `worldPersistence` (service class for serialization/load/save)
   - `combatTurnManager` (stateful turn lifecycle class)
   - `combatDebugHud` / `combatDebugShell` (debug services)
   - `worldSceneLoader`, `playerCharacterLoader`, `enemyCharacterLoader`, `entityCharacterLoader` (loader services)

4. **Domain objects with behavior**
   - Convert combat unit/player/enemy runtime records into typed domain classes where behavior currently lives in orchestrator helpers (movement/attack validation).

#### Should remain functional or pure typed-data modules

1. **Contracts and constants**
   - `world/contracts.ts`
   - `runtimeContracts.ts`
   - `shared/types.ts`
   - `world/constants/types` (migrate to `types.ts`, keep as typed const + types)
   - `assetCatalog` (typed const data + pure resolver function)
   - `entityArchetypes`, `phoneSpriteAtlas`, `phoneDisplayLayout`, `inventoryConfig`

2. **Selectors and action reducers (pure state transforms)**
   - `world/selectors/*`
   - `world/actions/*` (including `restActions`)

3. **Pure helpers/algorithms**
   - `combatGrid`, `combatGridMapper`, `combatGridConfig`
   - `combatActionResolver`, `combatTargetSelectionFlow`
   - `combatGridOverlayRenderer`, `combatMovementRangeHighlighter` (can be thin service wrappers; core math remains pure)
   - `entityNormalization`, `entityNormalizationConfig`, `entityVisualBounds`, `entityGameplayDimensions`
   - `movementTargetState`, `playerActionModeStateMachine`
   - `worldMigrations`, `worldState`, `world/entities/*`, `world/utils/object`
   - `interactiveAtlasButton`, inventory grid/scrollbar view helpers

> Design rule: when a module primarily stores mutable runtime handles (scene refs, observers, input subscriptions, timers), use a class. When it maps input->output data with minimal side effects, keep it functional.

## 2) Migration phases

## Phase 0 — Import canonicalization + safety net

**Affected modules**
- Every TS entrypoint currently importing `.js` sibling/twin files.
- Test suites under `tests/*.mjs` that still target JS paths.

**Class/functional impact**
- No architectural rewrite yet. This phase is path hygiene.

**Dependencies first**
- Ensure all TS modules import canonical TS modules (or extensionless imports resolved to TS sources).
- Keep JS twins temporarily during this pass.

**Can delete afterward**
- Nothing yet; this phase should end with equivalent runtime behavior and green tests/typecheck.

---

## Phase 1 — Remove TS/JS duplicate twins

**Affected modules**
- 20 twin JS files listed in audit section 1.1.A.

**Class/functional impact**
- Keep existing shape from TS twins (mostly functional today).

**Dependencies first**
- Phase 0 completed.
- Verify app entrypoints (`app.ts`, screens, rendering entrypoints, world imports) no longer reference twin `.js` files.

**Can delete afterward**
- Delete all 20 duplicate JS twin files.

---

## Phase 2 — World core migration (state + persistence + entities)

**Affected modules**
- `worldStore.js`, `worldState.js`, `worldPersistence.js`, `worldMigrations.js`, `world/index.js`
- `world/entities/*.js`, `world/constants/types.js`, `world/utils/object.js`, `world/actions/restActions.js`

**Class/functional impact**
- `WorldStore` => class (primary mutable domain store).
- `WorldPersistenceService` => class (I/O orchestration).
- `worldState`, `worldMigrations`, entities, selectors/actions => remain pure typed functions/data.
- `world/index` => typed barrel only.

**Dependencies first**
- constants/contracts/types must migrate first (`world/constants/types`, then world entities/worldState).
- actions/selectors must compile against typed `GameState` contracts.
- persistence migrates after `GameState` type model is stabilized.

**Can delete afterward**
- `src/world/*.d.ts` JS-bridge declarations:
  - `index.d.ts`
  - `worldStore.d.ts`
  - `worldPersistence.d.ts`
  - `worldState.d.ts`
  - `constants/types.d.ts`
- World JS source files replaced by TS.

---

## Phase 3 — Rendering foundation migration (non-combat primitives)

**Affected modules**
- `worldSceneLoader`, character loaders, entity normalization/dimensions modules,
- `playerSpawn`, `movementTargetState`, `playerActionModeStateMachine`, `gameplayCameraController`, `sceneGroundClickInput`, `playerMovementController`, `interactiveAtlasButton`, phone map inventory UI helpers.

**Class/functional impact**
- Loader modules become service classes (stateful runtime resources + disposal hooks).
- Input/camera modules become controller classes.
- math/config/normalization modules remain functional.

**Dependencies first**
- First migrate data/config modules (`entityArchetypes`, normalization configs, inventory config/layout/atlas).
- Then loader stack (`entityCharacterLoader` -> player/enemy loaders -> world scene loader).
- Then controllers consuming loaders/runtime.

**Can delete afterward**
- Rendering/UI JS files in this phase that now have TS replacements.

---

## Phase 4 — Combat subsystem migration (OO-heavy runtime)

**Affected modules**
- `combatRuntime`, `combatTurnManager`, `combatAttackInputController`, `combatPlayerMovementController`, `combatDebugHud`, `combatDebugShell`
- plus combat helper modules (`combatGrid*`, `combatActionResolver`, `combatTargetSelectionFlow`, `combatMovementRangeHighlighter`).

**Class/functional impact**
- `CombatRuntime` class orchestrating scene, units, and combat lifecycle.
- `TurnManager` class owning state machine.
- Input/debug modules as controller/service classes.
- Grid/path/resolution helpers remain functional unless stateful caches are introduced.

**Dependencies first**
- Phase 3 loader/controller contracts in place.
- Runtime contracts widened to typed `CombatState`, `CombatUnit`, `CombatActionResult`.
- `sceneRuntime` TS API updated to depend on typed combat runtime class.

**Can delete afterward**
- Remaining combat JS modules after TS parity validation.

---

## Phase 5 — Final TS-only enforcement + strictness ramp

**Affected modules**
- Whole repository (`src`, tests, tsconfig).

**Class/functional impact**
- No new architecture changes; enforcement and cleanup.

**Dependencies first**
- All previous phases complete.
- No runtime imports to `.js` sources.

**Can delete afterward**
- Any residual JS source under `src/`.
- Temporary compatibility exports and stale migration notes.

**Compiler/build tightening**
- Disable `allowJs`.
- Enable stricter checks incrementally (`strictNullChecks`, `noUncheckedIndexedAccess`, then full `strict`).
- Make `tsc --noEmit` required in CI for PR merge.

## 3) Recommended target architecture snapshot

- **App layer**: controllers/coordinators as classes with explicit `start()/dispose()` lifecycles.
- **Domain layer (world/combat rules)**: typed pure functions + small domain objects/classes where behavior is stateful and cohesive.
- **Contracts layer**: interfaces/types only, no runtime side effects.
- **Persistence/adapters**: service classes behind typed interfaces.
- **Utilities/config**: pure functions + `as const` catalogs.

This gives a clear split between lifecycle-heavy runtime objects (class-based) and deterministic business logic/data (functional/typed).

## 4) Exit criteria (definition of done)

1. `src/` contains **0 `.js`** source files.
2. JS-bridge declaration files (`*.d.ts` that only shadow local JS modules) are removed.
3. Runtime orchestrators/controllers/stores are class-based with explicit lifecycle methods.
4. Selectors/actions/config/utilities remain pure and strongly typed.
5. Typecheck + tests pass in CI with TS-only source enforcement.
