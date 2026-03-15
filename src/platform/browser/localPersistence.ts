/**
 * Платформенный адаптер браузера: изолирует работу с окружением (URL, storage, загрузка seed/asset path).
 */
import type { PersistenceContract, PersistenceKeys, PersistenceStorage } from '../../shared/types.ts';

/** Определяет контракт `BrowserPersistenceStorageProvider` для согласованного взаимодействия модулей в контексте `platform/browser/localPersistence`. */
export interface BrowserPersistenceStorageProvider {
  getLocalStorage(): PersistenceStorage | undefined;
}

/** Определяет контракт `BrowserPersistenceConfig` для согласованного взаимодействия модулей в контексте `platform/browser/localPersistence`. */
export interface BrowserPersistenceConfig {
  keys?: PersistenceKeys;
  storage?: PersistenceStorage;
  storageProvider?: BrowserPersistenceStorageProvider;
}

/** Описывает тип `BrowserStorageMode`, который формализует структуру данных в модуле `platform/browser/localPersistence`. */
export type BrowserStorageMode = 'localStorage' | 'memory';

/** Описывает тип `BrowserStorageFallbackReason`, который формализует структуру данных в модуле `platform/browser/localPersistence`. */
export type BrowserStorageFallbackReason =
  | 'localStorage_available'
  | 'localStorage_missing'
  | 'localStorage_unavailable';

/** Определяет контракт `BrowserStorageResolution` для согласованного взаимодействия модулей в контексте `platform/browser/localPersistence`. */
export interface BrowserStorageResolution {
  storage: PersistenceStorage;
  mode: BrowserStorageMode;
  fallbackReason: BrowserStorageFallbackReason;
}

/** Класс `GlobalBrowserStorageProvider` координирует соответствующий сценарий модуля `platform/browser/localPersistence` и инкапсулирует связанную логику. */
class GlobalBrowserStorageProvider implements BrowserPersistenceStorageProvider {
  /** Возвращает `getLocalStorage` внутри жизненного цикла класса. */
  getLocalStorage(): PersistenceStorage | undefined {
    return globalThis.localStorage;
  }
}

/** Создаёт и настраивает `createInMemoryStorage` в ходе выполнения связанного игрового сценария. */
function createInMemoryStorage(): PersistenceStorage {
  const map = new Map<string, string>();
  return {
    /** Возвращает `getItem` внутри жизненного цикла класса. */
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    /** Обновляет `setItem` внутри жизненного цикла класса. */
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
    /** Выполняет `removeItem` внутри жизненного цикла класса. */
    removeItem(key: string) {
      map.delete(key);
    }
  };
}

/** Класс `BrowserPersistenceService` координирует соответствующий сценарий модуля `platform/browser/localPersistence` и инкапсулирует связанную логику. */
export class BrowserPersistenceService implements PersistenceContract {
  readonly #storage: PersistenceStorage;
  readonly #keys: PersistenceKeys;
  readonly #storageMode: BrowserStorageMode;
  readonly #storageFallbackReason: BrowserStorageFallbackReason;

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

    this.#storage = resolution.storage;
    this.#keys = keys;
    this.#storageMode = resolution.mode;
    this.#storageFallbackReason = resolution.fallbackReason;
  }

  get storage(): PersistenceStorage {
    return this.#storage;
  }

  get keys(): PersistenceKeys {
    return this.#keys;
  }

  get storageMode(): BrowserStorageMode {
    return this.#storageMode;
  }

  get storageFallbackReason(): BrowserStorageFallbackReason {
    return this.#storageFallbackReason;
  }

  /** Выполняет `hasSaveData` внутри жизненного цикла класса. */
  hasSaveData(): boolean {
    try {
      return Boolean(this.#storage.getItem(this.#keys.worldSave));
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

/** Константа `PERSISTENCE_KEYS` хранит общие настройки/данные, которые переиспользуются в модуле `platform/browser/localPersistence`. */
export const PERSISTENCE_KEYS: PersistenceKeys = Object.freeze({
  worldSave: 'sillyrpg.save.v4'
});

/** Создаёт и настраивает `createStandalonePersistence` в ходе выполнения связанного игрового сценария. */
export function createStandalonePersistence(config: BrowserPersistenceConfig = {}): PersistenceContract {
  return new BrowserPersistenceService(config);
}
