# SillyRPG (SillyTavern UI Extension)

SillyRPG is a lightweight, menu-driven RPG UI extension for SillyTavern.

## Install

1. Open **SillyTavern → Extensions**.
2. Install this extension from your repo URL (folder containing `manifest.json`).
3. Reload SillyTavern.
4. Click the **SillyRPG** button to open the overlay.

## Demo flow

1. Open **SillyRPG**.
2. Click **New Game**.
3. Click **New City District** from the city level.
4. Click **Night Pharmacy** or **Apartment 204**.
5. Click an NPC node.
6. SillyRPG attempts to open an existing SillyTavern chat for the mapped character name.

## Character mapping for NPC chat launch

NPCs map by exact `stCharacterName` in `src/world/seed_world.json`.

Current sample NPC mappings:
- `Olek Mirov`
- `Officer Sena Holt`
- `Ivo Rask`

Create SillyTavern characters with those exact names to enable one-click chat open.

## Save and resume

- Save key: `sillyrpg.save.v3`
- Core game state is persisted; UI navigation state is maintained separately in UI layer.
- Use **Continue** or **Load Game** from Main Menu to resume.

## World data format

`src/world/seed_world.json` includes:
- `world`: time-of-day and clock seed
- `maps.levelConfigs`: data-driven map-level registry
- `maps.nodes`: map nodes (`city`, `district`, `building`, `npc`) with parent relations
- `setting`: normalized district zones, points of interest, factions, and location metadata
- `player`, `characters`, `items` seeds for simulation state

All image paths are local relative paths under `assets/`.

## Assets

MVP placeholders are included locally:
- `assets/city/city_map_placeholder.svg`
- `assets/districts/market_iso_placeholder.svg`
- `assets/locations/shop_bg_placeholder.svg`
- `assets/npcs/npc_placeholder.svg`

## Troubleshooting

- If NPC click does not open chat, confirm the SillyTavern character name exactly matches `stCharacterName`.
- If no API hooks are available in your ST build, SillyRPG falls back to notification + debug logs.
- Open browser console and filter logs by `[SillyRPG]` for diagnostics.

## Developer docs

- Entity normalization onboarding (adding new monsters/entities): `docs/development/entity-normalization.md`

## World core

Core game state now lives under `src/world/` via `worldStore`:
- `src/world/types.js`: enums and constants (`TIME_OF_DAY`, `MAP_LEVEL`)
- `src/world/worldStore.js`: thin composition store (wires actions/selectors/persistence only)
- `src/world/seed_world.json`: data-driven map level configs + nodes + item/character/player seed data

Map screens are rendered by a generic level view (`src/ui/screens/mapLevelView.js`), so new levels/nodes are added through config/data, not UI rewrites.

- `src/world/actions/`, `selectors/`, `entities/`, `worldPersistence.js`, `worldMigrations.js`: separated domain responsibilities.
