interface AssetCatalog {
  scenes: Record<string, string>;
  scene?: Record<string, string>;
  textures: Record<string, string>;
  models: {
    characters: Record<string, string>;
  };
  maps: {
    city: Record<string, string>;
    districts: Record<string, string>;
  };
  icons: Record<string, string>;
  [key: string]: unknown;
}

const assetPaths: AssetCatalog = {
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

assetPaths.scene = assetPaths.scenes;

export const ASSET_PATHS = Object.freeze(assetPaths);

export function getAssetPath(pathKey: string): string {
  if (typeof pathKey !== 'string' || pathKey.length === 0) {
    throw new Error('Asset key must be a non-empty string.');
  }

  const segments = pathKey.split('.');
  let value: unknown = ASSET_PATHS;

  for (const segment of segments) {
    if (typeof value !== 'object' || !value || !(segment in value)) {
      value = undefined;
      break;
    }

    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value !== 'string') {
    throw new Error(`Unknown asset key: ${pathKey}`);
  }

  return value;
}
