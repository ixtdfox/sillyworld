import type { SeedLoader, WorldSeed } from '../../shared/types.js';

interface SeedFetchEnvironment {
  supportsFetch: boolean;
}

interface SeedRequestDescriptor {
  requestedPath: string;
  resolvedUrl: string;
}

export interface SeedLoadResult {
  seed: WorldSeed;
  resolvedUrl: string;
}

function resolveSeedFetchEnvironment(): SeedFetchEnvironment {
  return {
    supportsFetch: typeof fetch === 'function'
  };
}

function resolveSeedRequest(seedPath: string): SeedRequestDescriptor {
  return {
    requestedPath: seedPath,
    resolvedUrl: new URL(seedPath, import.meta.url).toString()
  };
}

export const loadSeed: SeedLoader = async (seedPath = '../../world/seed_world.json') => {
  const fetchEnv = resolveSeedFetchEnvironment();
  if (!fetchEnv.supportsFetch) {
    throw new Error('Failed to load seed data: fetch API is not available in this environment.');
  }

  const request = resolveSeedRequest(seedPath);
  console.info('[SillyRPG] Loading world seed.', { url: request.resolvedUrl });
  const response = await fetch(request.resolvedUrl);

  if (!response.ok) {
    throw new Error(`Failed to load seed data: ${response.status} ${response.statusText}`);
  }

  const seed: WorldSeed = await response.json();
  const result: SeedLoadResult = {
    seed,
    resolvedUrl: request.resolvedUrl
  };

  console.info('[SillyRPG] World seed loaded.', { url: result.resolvedUrl });
  return result.seed;
};
