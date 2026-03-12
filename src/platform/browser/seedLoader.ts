import type { SeedLoader as SeedLoaderContract, WorldSeed } from '../../shared/types.js';

export interface SeedLoader {
  loadSeed(seedPath?: string): Promise<WorldSeed>;
}

export interface SeedFetchApi {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface SeedUrlResolver {
  resolve(seedPath: string): string;
}

class BrowserSeedFetchApi implements SeedFetchApi {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }
}

class ModuleSeedUrlResolver implements SeedUrlResolver {
  resolve(seedPath: string): string {
    return new URL(seedPath, import.meta.url).toString();
  }
}

export interface SeedLoaderConfig {
  fetchApi?: SeedFetchApi;
  urlResolver?: SeedUrlResolver;
  defaultSeedPath?: string;
}

export class BrowserSeedLoader implements SeedLoader {
  private readonly fetchApi: SeedFetchApi;
  private readonly urlResolver: SeedUrlResolver;
  private readonly defaultSeedPath: string;

  constructor(config: SeedLoaderConfig = {}) {
    this.fetchApi = config.fetchApi ?? new BrowserSeedFetchApi();
    this.urlResolver = config.urlResolver ?? new ModuleSeedUrlResolver();
    this.defaultSeedPath = config.defaultSeedPath ?? '../../world/seed_world.json';
  }

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
}

const defaultSeedLoader = new BrowserSeedLoader();

export const loadSeed: SeedLoaderContract = async (seedPath) => {
  return defaultSeedLoader.loadSeed(seedPath);
};
