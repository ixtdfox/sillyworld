export async function loadSeed(seedPath = '../world/seed_world.json') {
  const url = new URL(seedPath, import.meta.url).toString();
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load seed data: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
