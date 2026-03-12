# Asset loading

Sillyworld now uses a standalone browser asset resolver instead of any SillyTavern runtime base-url helpers.

## How paths are defined

- Canonical asset paths live in `src/core/assets/assetCatalog.js` (`ASSET_PATHS`).
- Use catalog keys where possible via `getAssetPath(pathKey)` to avoid scattering string literals.

## How URLs are resolved at runtime

- `src/platform/browser/assetResolver.js` resolves asset URLs using `document.baseURI` (with safe fallbacks), so assets load correctly in normal web hosting setups.
- `resolveAssetPath(relPath)` resolves any relative asset path.
- `resolveCatalogAssetPath(pathKey)` resolves catalog keys directly to absolute URLs.

## Coverage

Current cataloged assets include:
- UI textures / atlases (`assets/sprites.png`)
- Map images (`assets/map.png` and SVG placeholders)
- 3D scenes (`assets/scene_test.glb`, `assets/combat.glb`)
- Character models (`assets/character.glb`, `assets/enemy.glb`)
- Icons/sprites (NPC and location placeholder SVGs)
