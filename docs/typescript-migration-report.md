# TypeScript Migration Stabilization Report

## Scope of this pass
This pass focused on **stabilization** rather than broad rewrites:
- tightening type safety in existing `.ts` modules,
- reducing temporary escape hatches (`any`, fragile casts),
- auditing remaining JavaScript for migration readiness,
- and enabling stricter compiler options that pass cleanly now.

## What was migrated
No additional runtime modules were converted from `.js` to `.ts` in this pass.

Instead, this pass completed a **type-hardening sweep** across existing TypeScript entry points and UI/runtime glue code:
- strengthened Babylon GUI typing in phone map viewport/screen code,
- removed avoidable casts in app flow and screen contract helpers,
- improved time/phase normalization via typed guards,
- improved NPC availability normalization typing,
- and resolved index-signature access issues so stricter TS checks can be enabled.

## JavaScript audit

### A) JS files with TS twins (kept intentionally for now)
These `.js` files have sibling `.ts` implementations (20 files total), e.g. in:
- `src/platform/browser/*`
- `src/ui/rendering/{babylonRuntime,districtExplorationRuntime,encounterInteractionInput,sceneRuntime}.js`
- `src/ui/screens/sceneViewScreen.js`
- `src/world/actions/*.js` (except `restActions.js`)
- `src/world/selectors/*.js`

**Decision:** keep for now.

**Reason:** several runtime and test imports still target `.js` paths; removing these compatibility surfaces now risks churn in test/runtime resolution and package consumers. These should be removed in a dedicated “de-duplication” step once imports and build/test targets are fully TS-oriented.

### B) JS-only modules that are core runtime/domain code (defer migration)
These are still active and should be migrated in planned batches, not ad hoc:
- combat/rendering runtime cluster in `src/ui/rendering/*.js` (combat systems, loaders, camera/input helpers),
- world store/state/migrations/entities in `src/world/*.js` and `src/world/entities/*.js`,
- shared utility/config modules such as `src/core/assets/assetCatalog.js` and `src/world/constants/types.js`.

**Decision:** intentionally left as JS in this pass.

**Reason:** these modules are interconnected and heavily covered by behavior tests; migration is best done subsystem-by-subsystem with focused regression checks.

### C) JS-only modules that are mostly UI data/config wrappers (defer migration)
Examples:
- `src/ui/screens/phoneMap/phoneSpriteAtlas.js`
- `src/ui/screens/phoneMap/phoneDisplayLayout.js`
- inventory UI helpers under `src/ui/screens/phoneMap/inventory/*.js`

**Decision:** leave as JS for now.

**Reason:** low-risk to keep as JS temporarily; migration can be fast later with `as const` typing and lightweight interfaces.

### D) Obsolete candidates
No files were removed in this stabilization pass.

Potentially obsolete/duplicate `.js` compatibility layers exist where `.ts` twins already exist; remove in a dedicated cleanup once all imports are TS-safe.

## Compromises that still exist
- `allowJs` remains enabled to keep mixed TS/JS modules compiling during transition.
- The repository still contains a large JS runtime surface, especially in rendering/combat and world state modules.
- Some boundary casts remain where upstream contracts are still broad/legacy.

## Compiler options tightened in this pass
Enabled and validated in `tsconfig.json`:
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `noImplicitOverride: true`
- `noPropertyAccessFromIndexSignature: true`

These now pass with `npx tsc -p tsconfig.json`.

## Recommended next cleanup steps
1. **De-duplicate JS/TS twins:** update imports to canonical TS modules and remove shadow `.js` twins in one PR.
2. **Migrate world core next:** `worldStore`, `worldState`, migrations, and entities as a single typed domain batch.
3. **Migrate combat/rendering subsystem:** convert by dependency order (config/types -> pure helpers -> runtime orchestrators).
4. **Add contract-first typing for Babylon adapters:** centralize GUI/engine interfaces in shared runtime contracts.
5. **Raise strictness in stages:**
   - first `strictNullChecks`,
   - then `noUncheckedIndexedAccess`,
   - finally full `strict` once JS surface and nullable boundaries are reduced.
6. **Retire `allowJs`** after JS-only runtime modules are converted or explicitly isolated.
