# TypeScript Strictness Hardening Report

## Scope
This pass focused on tightening compiler checks that are already useful for the migrated TypeScript codebase, and replacing weakly-typed object normalization in world-state creation paths with named domain types.

## Compiler settings strengthened
Updated `tsconfig.json`:

- enabled `noImplicitAny`
- enabled `strictNullChecks`
- enabled `exactOptionalPropertyTypes`
- enabled `useUnknownInCatchVariables`
- enabled `noImplicitThis`

`strict` remains `false` for now to avoid introducing a broad compile break in one step while the rendering/runtime layer is still being fully typed.

## Weak spots fixed

### 1) World entity normalization now uses named types
Refactored seed-normalization modules to remove implicit object shapes and default `{}`-inferred unknown objects:

- `src/world/entities/characters.ts`
- `src/world/entities/player.ts`
- `src/world/entities/world.ts`
- `src/world/entities/maps.ts`
- `src/world/entities/items.ts`
- `src/world/entities/setting.ts`

Improvements applied:
- replaced untyped parameters with explicit `Partial<...>` seed types
- replaced inferred object literals with typed return contracts (`PlayerState`, `WorldState`, etc.)
- reduced weak casts in world-state assembly
- introduced lightweight local seed interfaces where upstream contracts are still broader than practical normalization input

### 2) Removed unnecessary cast usage in app/store flow
- `src/app.ts`: removed array assertion for pending phase transition selection and replaced with typed destructuring.
- `src/world/worldStore.ts`: replaced several `as` result coercions with explicit local typed bindings.

### 3) Reduced migration-era cast in state assembly
- `src/world/worldState.ts`: replaced the `unknown as never[]` cast with a typed `CharacterState[]` path.

## Remaining justified compromises

1. **Repository-wide strict mode not fully enabled yet**
   - The combat/rendering runtime (`src/ui/rendering/**`) still contains many implicit-`any` parameters and broad object defaults.
   - Enabling full `strict: true` immediately would generate a very large migration surface area in that layer.

2. **`exactOptionalPropertyTypes` currently exposes API shape mismatches**
   - Some action/store response contracts still return `undefined` values on optional fields rather than omitting those keys.
   - This is now visible and should be resolved with response-shape normalization in a follow-up pass.

3. **Map metadata remains intentionally flexible**
   - Some map node metadata keys are data-driven and still accessed via index signatures.
   - These should be progressively formalized into typed metadata contracts as schemas stabilize.

## Validation run during this pass

- application build still succeeds (`vite build`)
- runtime tests still pass (`node --test tests/*.test.mjs`)
- `tsc` now surfaces stricter diagnostics that identify the remaining hardening backlog for follow-up work
