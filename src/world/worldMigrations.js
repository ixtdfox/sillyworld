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

function migrateV2ToV3(v2State) {
  return {
    ...v2State,
    schemaVersion: 3
  };
}

export function migrateGameState(rawState, fallbackSeed = {}) {
  if (!rawState || typeof rawState !== 'object') return null;

  if (rawState.schemaVersion === SCHEMA_VERSION) {
    return createGameState(rawState);
  }

  if (rawState.schemaVersion === 2) {
    return createGameState(migrateV2ToV3(rawState));
  }

  if (rawState.schemaVersion === 1 || rawState.schemaVersion == null) {
    const v2 = migrateV1ToV2(rawState, fallbackSeed);
    const v3 = migrateV2ToV3(v2);
    return createGameState(v3);
  }

  return null;
}
