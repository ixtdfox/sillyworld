import test from 'node:test';
import assert from 'node:assert/strict';

import { getAssetPath } from '../src/core/assets/assetCatalog.ts';
import { resolveAssetPath, resolveCatalogAssetPath } from '../src/platform/browser/assetResolver.ts';

test('getAssetPath resolves catalog keys for scene, textures, and models', () => {
  assert.equal(getAssetPath('scenes.districtExploration'), 'assets/scene_test.glb');
  assert.equal(getAssetPath('textures.phoneUiAtlas'), 'assets/sprites.png');
  assert.equal(getAssetPath('models.characters.player'), 'assets/character.glb');
});

test('resolveAssetPath uses document.baseURI when available', () => {
  globalThis.document = { baseURI: 'https://example.invalid/game/' };
  globalThis.window = { location: { href: 'https://example.invalid/fallback/' } };

  assert.equal(resolveAssetPath('assets/map.png'), 'https://example.invalid/game/assets/map.png');
});

test('resolveCatalogAssetPath resolves catalog entries into absolute urls', () => {
  globalThis.document = { baseURI: 'https://example.invalid/game/' };
  globalThis.window = { location: { href: 'https://example.invalid/fallback/' } };

  assert.equal(resolveCatalogAssetPath('textures.cityMap'), 'https://example.invalid/game/assets/map.png');
  assert.equal(resolveCatalogAssetPath('icons.npcPlaceholder'), 'https://example.invalid/game/assets/npcs/npc_placeholder.svg');
});
