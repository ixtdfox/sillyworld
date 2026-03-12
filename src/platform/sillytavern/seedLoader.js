export async function loadSeedFromSillyTavern(seedPath = 'src/world/seed_world.json') {
  const base = window.__SILLYRPG__?.EXT_BASE || window.location.href;
  const url = new URL(seedPath, base).toString();
  const response = await fetch(url);
  return response.json();
}
