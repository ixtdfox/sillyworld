function createInMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

function resolveBrowserStorage() {
  const candidate = globalThis.localStorage;
  if (!candidate) return createInMemoryStorage();

  try {
    const probeKey = '__sillyrpg.persistence_probe__';
    candidate.setItem(probeKey, '1');
    candidate.removeItem(probeKey);
    return candidate;
  } catch {
    return createInMemoryStorage();
  }
}

export const PERSISTENCE_KEYS = Object.freeze({
  worldSave: 'sillyrpg.save.v4'
});

export function createStandalonePersistence({
  keys = PERSISTENCE_KEYS,
  storage = resolveBrowserStorage()
} = {}) {
  return {
    storage,
    keys,
    hasSaveData() {
      try {
        return Boolean(storage.getItem(keys.worldSave));
      } catch {
        return false;
      }
    }
  };
}
