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
3. Click **Market** district in city map.
4. Click **Shop** POI.
5. Click an NPC.
6. SillyRPG attempts to open an existing SillyTavern chat for the mapped character name.

## Character mapping for NPC chat launch

NPCs map by exact `stCharacterName` in `src/world/seed_world.json`.

Current sample NPC mappings:
- `Mira the Shopkeeper`
- `Town Guard Aster`

Create SillyTavern characters with those exact names to enable one-click chat open.

## Save and resume

- Save key: `sillyrpg.save.v1`
- Navigation state is persisted while moving between screens.
- Use **Continue** or **Load Game** from Main Menu to resume.

## World data format

`src/world/seed_world.json` includes:
- `city`: city metadata + `mapImage` + district list
- district `pois`: each points to a `locationId`
- `locations`: each location has `backgroundImage` + `npcs`
- each NPC has `id`, `name`, `stCharacterName`, optional `avatar`

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
