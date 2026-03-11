# Entity normalization onboarding

Use normalization whenever you add a new monster/entity model so scale, collision, and interaction distances stay predictable.

## Where configs live

- Canonical normalization table: `src/ui/rendering/entityNormalizationConfig.js`
- Runtime validation + application logic: `src/ui/rendering/entityNormalization.js`
- Ground/bounds helpers: `src/ui/rendering/entityVisualBounds.js`
- Enemy archetype registry (model file + normalization id wiring): `src/ui/rendering/entityArchetypes.js`

## Required config fields

Each entry in `ENTITY_NORMALIZATION_CONFIG` must include:

- `targetHeight` (> 0)
- `collisionRadius` (> 0)
- `collisionHeight` (> 0)
- `attackRange` (>= 0)

Optional but commonly used:

- `interactionRadius` (defaults to `attackRange`)
- `groundOffset` (defaults to `0`)
- `orientationCorrection.{pitchDegrees|yawDegrees|rollDegrees}` (defaults each axis to `0`)
- `entityId` and/or `archetypeId` aliases (used for lookup)
- `debugLabel`

## How auto-scaling works

At load time, normalization calls `fitModelToHeight(...)`:

1. Measure current visual height from hierarchy bounds.
2. Compute `scaleFactor = targetHeight / sourceHeight`.
3. Apply that uniform scale to the root node.

Result: different source assets end up at one gameplay height target in world units (1 unit = 1 meter).

## How ground alignment works

After scaling, normalization calls `placeEntityOnGround(...)`:

1. Measure current bottom Y from hierarchy bounds.
2. Compute target bottom Y as `groundY + groundOffset` (default `groundY = 0`).
3. Move root `position.y` by the required delta.

Use `groundOffset` for assets whose visual pivot/feet are not exactly at floor contact.

## Onboard a new monster asset

1. Add/import the model file under `assets/` (or point to the correct existing file).
2. Register a new archetype in `ENEMY_CHARACTER_ARCHETYPES` with:
   - `archetypeId`
   - `entityLabel`
   - `modelFile`
   - `normalizationConfigId`
3. Add a matching entry in `ENTITY_NORMALIZATION_CONFIG`.
   - Set `archetypeId` to the same id to enable alias lookup.
   - Start with realistic gameplay metrics (`targetHeight`, collision, ranges).
4. Run and verify in exploration/combat; tune only normalization fields first.
5. If facing is wrong, add `orientationCorrection` instead of editing the source mesh.

## Quick troubleshooting

- **Too big / too small**: adjust `targetHeight`.
- **Floating**: lower `groundOffset` (often toward `0` or negative if needed).
- **Sunk into floor**: raise `groundOffset`.
- **Wrong facing/tilt**: set `orientationCorrection` yaw/pitch/roll.
- **Config not found errors**: confirm `normalizationConfigId` and `archetypeId`/entry key match exactly.

## Example config entry

```js
monster_stone_golem: Object.freeze({
  archetypeId: 'monster_stone_golem',
  targetHeight: 3.4,
  collisionRadius: 1,
  collisionHeight: 3.4,
  attackRange: 2.4,
  interactionRadius: 3,
  groundOffset: 0,
  orientationCorrection: Object.freeze({
    yawDegrees: 180
  }),
  debugLabel: 'Stone Golem'
})
```
