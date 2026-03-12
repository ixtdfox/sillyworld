import type { PersistenceContract, PersistenceKeys, PersistenceStorage } from '../../shared/types.js';

interface PersistenceConfig {
  keys?: PersistenceKeys;
  storage?: PersistenceStorage;
}

type BrowserStorageMode = 'localStorage' | 'memory';

type BrowserStorageFallbackReason =
  | 'localStorage_available'
  | 'localStorage_missing'
  | 'localStorage_unavailable';

interface BrowserStorageResolution {
  storage: PersistenceStorage;
  mode: BrowserStorageMode;
  fallbackReason: BrowserStorageFallbackReason;
}

function createInMemoryStorage(): PersistenceStorage {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    removeItem(key: string) {
      map.delete(key);
    }
  };
}

function resolveBrowserStorage(): BrowserStorageResolution {
  if (typeof globalThis.localStorage === 'undefined') {
    return {
      storage: createInMemoryStorage(),
      mode: 'memory',
      fallbackReason: 'localStorage_missing'
    };
  }

  const candidate = globalThis.localStorage;
  try {
    const probeKey = '__sillyrpg.persistence_probe__';
    candidate.setItem(probeKey, '1');
    candidate.removeItem(probeKey);
    return {
      storage: candidate,
      mode: 'localStorage',
      fallbackReason: 'localStorage_available'
    };
  } catch {
    return {
      storage: createInMemoryStorage(),
      mode: 'memory',
      fallbackReason: 'localStorage_unavailable'
    };
  }
}

export const PERSISTENCE_KEYS: PersistenceKeys = Object.freeze({
  worldSave: 'sillyrpg.save.v4'
});

export function createStandalonePersistence({
  keys = PERSISTENCE_KEYS,
  storage = resolveBrowserStorage().storage
}: PersistenceConfig = {}): PersistenceContract {
  return {
    storage,
    keys,
    hasSaveData() {
      try {
        return Boolean(storage.getItem(keys.worldSave));
      } catch {
        return false;
      }
    }
  };
}
