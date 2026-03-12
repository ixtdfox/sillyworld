const assetPaths = {
  scenes: {
    districtExploration: 'assets/scene_test.glb',
    combatPrototype: 'assets/combat.glb'
  },
  textures: {
    phoneUiAtlas: 'assets/sprites.png',
    cityMap: 'assets/map.png'
  },
  models: {
    characters: {
      player: 'assets/character.glb',
      enemyHumanoidRaider: 'assets/enemy.glb',
      monsterStoneGolem: 'assets/enemy.glb'
    }
  },
  maps: {
    city: {
      placeholder: 'assets/city/city_map_placeholder.svg'
    },
    districts: {
      marketPlaceholder: 'assets/districts/market_iso_placeholder.svg'
    }
  },
  icons: {
    npcPlaceholder: 'assets/npcs/npc_placeholder.svg',
    locationBackgroundPlaceholder: 'assets/locations/shop_bg_placeholder.svg'
  }
};

// Backward-compatible alias for older call sites.
assetPaths.scene = assetPaths.scenes;

export const ASSET_PATHS = Object.freeze(assetPaths);

export function getAssetPath(pathKey) {
  if (typeof pathKey !== 'string' || pathKey.length === 0) {
    throw new Error('Asset key must be a non-empty string.');
  }

  const segments = pathKey.split('.');
  let value = ASSET_PATHS;

  for (const segment of segments) {
    value = value?.[segment];
  }

  if (typeof value !== 'string') {
    throw new Error(`Unknown asset key: ${pathKey}`);
  }

  return value;
}
