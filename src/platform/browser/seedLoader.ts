import type { SeedLoader as SeedLoaderContract, WorldSeed } from '../../shared/types.ts';

/** Определяет контракт `SeedLoader` для согласованного взаимодействия модулей в контексте `platform/browser/seedLoader`. */
export interface SeedLoader {
  loadSeed(seedPath?: string): Promise<WorldSeed>;
}

/** Определяет контракт `SeedFetchApi` для согласованного взаимодействия модулей в контексте `platform/browser/seedLoader`. */
export interface SeedFetchApi {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/** Определяет контракт `SeedUrlResolver` для согласованного взаимодействия модулей в контексте `platform/browser/seedLoader`. */
export interface SeedUrlResolver {
  resolve(seedPath: string): string;
}

const defaultSeedFetchApi: SeedFetchApi = {
  /** Выполняет `fetch` внутри жизненного цикла класса. */
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }
};

const defaultSeedUrlResolver: SeedUrlResolver = {
  /** Определяет `resolve` внутри жизненного цикла класса. */
  resolve(seedPath: string): string {
    return new URL(seedPath, import.meta.url).toString();
  }
};

/** Определяет контракт `SeedLoaderConfig` для согласованного взаимодействия модулей в контексте `platform/browser/seedLoader`. */
export interface SeedLoaderConfig {
  fetchApi?: SeedFetchApi;
  urlResolver?: SeedUrlResolver;
  defaultSeedPath?: string;
}

/** Класс `BrowserSeedLoader` координирует соответствующий сценарий модуля `platform/browser/seedLoader` и инкапсулирует связанную логику. */
export class BrowserSeedLoader implements SeedLoader {
  private readonly fetchApi: SeedFetchApi;
  private readonly urlResolver: SeedUrlResolver;
  private readonly defaultSeedPath: string;

  constructor(config: SeedLoaderConfig = {}) {
    this.fetchApi = config.fetchApi ?? defaultSeedFetchApi;
    this.urlResolver = config.urlResolver ?? defaultSeedUrlResolver;
    this.defaultSeedPath = this.resolveDefaultSeedPath(config.defaultSeedPath);
  }

  /** Загружает `loadSeed` внутри жизненного цикла класса. */
  async loadSeed(seedPath = this.defaultSeedPath): Promise<WorldSeed> {
    if (typeof fetch !== 'function') {
      throw new Error('Failed to load seed data: fetch API is not available in this environment.');
    }

    const resolvedUrl = this.urlResolver.resolve(seedPath);
    console.info('[SillyRPG] Loading world seed.', { url: resolvedUrl });
    const response = await this.fetchApi.fetch(resolvedUrl);

    if (!response.ok) {
      throw new Error(`Failed to load seed data: ${response.status} ${response.statusText}`);
    }

    const seed: WorldSeed = await response.json();
    console.info('[SillyRPG] World seed loaded.', { url: resolvedUrl });
    return seed;
  }

  private resolveDefaultSeedPath(defaultSeedPath?: string): string {
    const resolvedPath = defaultSeedPath ?? '../../world/seed_world.json';
    if (resolvedPath.trim().length === 0) {
      throw new Error('Seed loader defaultSeedPath must be a non-empty string.');
    }
    return resolvedPath;
  }
}

const defaultSeedLoader = new BrowserSeedLoader();

/** Константа `loadSeed` хранит общие настройки/данные, которые переиспользуются в модуле `platform/browser/seedLoader`. */
export const loadSeed: SeedLoaderContract = async (seedPath) => {
  return defaultSeedLoader.loadSeed(seedPath);
};
