function resolveBaseUrl() {
  if (window.__SILLYRPG__?.EXT_BASE) {
    return window.__SILLYRPG__.EXT_BASE;
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return new URL('../../', import.meta.url).toString();
    }
  } catch (error) {
    console.debug('[SillyRPG]', 'Unable to derive base URL from module location.', error);
  }

  return `${window.location.origin}/`;
}

export async function loadSeedFromSillyTavern(seedPath = 'src/world/seed_world.json') {
  const base = resolveBaseUrl();
  const url = new URL(seedPath, base).toString();
  const response = await fetch(url);
  return response.json();
}
