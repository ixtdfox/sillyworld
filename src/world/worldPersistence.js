import { migrateGameState } from './worldMigrations.js';

export const SAVE_KEY = 'sillyrpg.save.v2';

export function serializeGameState(state) {
  try {
    return JSON.stringify(state);
  } catch {
    return null;
  }
}

export function deserializeGameState(json, fallbackSeed = {}) {
  if (typeof json !== 'string' || json.length === 0) return null;
  try {
    const parsed = JSON.parse(json);
    return migrateGameState(parsed, fallbackSeed);
  } catch {
    return null;
  }
}

export function saveGameState(storage, state, key = SAVE_KEY) {
  const serialized = serializeGameState(state);
  if (!serialized) return false;
  try {
    storage.setItem(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function loadGameState(storage, fallbackSeed = {}, key = SAVE_KEY) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return deserializeGameState(raw, fallbackSeed);
  } catch {
    return null;
  }
}
