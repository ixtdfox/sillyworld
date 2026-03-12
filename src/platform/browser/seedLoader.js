/** @typedef {import('../../shared/types.js').SeedLoader} SeedLoader */
/** @typedef {import('../../shared/types.js').WorldSeed} WorldSeed */

/** @type {SeedLoader} */
export const loadSeed = async (seedPath = '../../world/seed_world.json') => {
  const url = new URL(seedPath, import.meta.url).toString();
  console.info('[SillyRPG] Loading world seed.', { url });
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load seed data: ${response.status} ${response.statusText}`);
  }

  /** @type {WorldSeed} */
  const seed = await response.json();
  console.info('[SillyRPG] World seed loaded.');
  return seed;
};
