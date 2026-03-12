/** @typedef {import('../../shared/types').SeedLoader} SeedLoader */

/** @type {SeedLoader} */
export async function loadSeed(seedPath = '../../world/seed_world.json') {
  const url = new URL(seedPath, import.meta.url).toString();
  console.info('[SillyRPG] Loading world seed.', { url });
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load seed data: ${response.status} ${response.statusText}`);
  }

  const seed = await response.json();
  console.info('[SillyRPG] World seed loaded.');
  return seed;
}
