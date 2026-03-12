import type { PersistenceContract, PersistenceKeys, PersistenceStorage } from '../../shared/types.ts';

export interface BrowserPersistenceStorageProvider {
  getLocalStorage(): PersistenceStorage | undefined;
}

export interface BrowserPersistenceConfig {
  keys?: PersistenceKeys;
  storage?: PersistenceStorage;
  storageProvider?: BrowserPersistenceStorageProvider;
}

export type BrowserStorageMode = 'localStorage' | 'memory';

export type BrowserStorageFallbackReason =
  | 'localStorage_available'
  | 'localStorage_missing'
  | 'localStorage_unavailable';

export interface BrowserStorageResolution {
  storage: PersistenceStorage;
  mode: BrowserStorageMode;
  fallbackReason: BrowserStorageFallbackReason;
}

class GlobalBrowserStorageProvider implements BrowserPersistenceStorageProvider {
  getLocalStorage(): PersistenceStorage | undefined {
    return globalThis.localStorage;
  }
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

export class BrowserPersistenceService implements PersistenceContract {
  readonly storage: PersistenceStorage;
  readonly keys: PersistenceKeys;
  readonly storageMode: BrowserStorageMode;
  readonly storageFallbackReason: BrowserStorageFallbackReason;

  constructor(config: BrowserPersistenceConfig = {}) {
    const keys = config.keys ?? PERSISTENCE_KEYS;
    const storageProvider = config.storageProvider ?? new GlobalBrowserStorageProvider();

    const resolution = config.storage
      ? {
          storage: config.storage,
          mode: 'memory' as const,
          fallbackReason: 'localStorage_unavailable' as const
        }
      : this.resolveBrowserStorage(storageProvider);

    this.storage = resolution.storage;
    this.keys = keys;
    this.storageMode = resolution.mode;
    this.storageFallbackReason = resolution.fallbackReason;
  }

  hasSaveData(): boolean {
    try {
      return Boolean(this.storage.getItem(this.keys.worldSave));
    } catch {
      return false;
    }
  }

  private resolveBrowserStorage(storageProvider: BrowserPersistenceStorageProvider): BrowserStorageResolution {
    const candidate = storageProvider.getLocalStorage();
    if (!candidate) {
      return {
        storage: createInMemoryStorage(),
        mode: 'memory',
        fallbackReason: 'localStorage_missing'
      };
    }

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
}

export const PERSISTENCE_KEYS: PersistenceKeys = Object.freeze({
  worldSave: 'sillyrpg.save.v4'
});

export function createStandalonePersistence(config: BrowserPersistenceConfig = {}): PersistenceContract {
  return new BrowserPersistenceService(config);
}
