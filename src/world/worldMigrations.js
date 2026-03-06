import { SCHEMA_VERSION } from './constants/types.js';
import { createGameState } from './worldState.js';

function migrateV1ToV2(v1State, fallbackSeed) {
  const base = createGameState(fallbackSeed);
  return {
    ...base,
    ...v1State,
    schemaVersion: 2,
    ui: undefined
  };
}

export function migrateGameState(rawState, fallbackSeed = {}) {
  if (!rawState || typeof rawState !== 'object') return null;

  if (rawState.schemaVersion === SCHEMA_VERSION) {
    return createGameState(rawState);
  }

  if (rawState.schemaVersion === 1 || rawState.schemaVersion == null) {
    const v2 = migrateV1ToV2(rawState, fallbackSeed);
    return createGameState(v2);
  }

  return null;
}
