import { SCHEMA_VERSION } from './constants/types.js';
import { createGameState } from './worldState.js';
import { normalizeTimePhase } from './actions/timeActions.js';

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

function migrateV3ToV4(v3State) {
  const currentPhase = normalizeTimePhase(v3State?.world?.timePhase, normalizeTimePhase(v3State?.world?.timeOfDay));

  return {
    ...v3State,
    schemaVersion: 4,
    world: {
      ...v3State.world,
      timePhase: currentPhase
    }
  };
}

export function migrateGameState(rawState, fallbackSeed = {}) {
  if (!rawState || typeof rawState !== 'object') return null;

  if (rawState.schemaVersion === SCHEMA_VERSION) {
    return createGameState(rawState);
  }

  if (rawState.schemaVersion === 3) {
    return createGameState(migrateV3ToV4(rawState));
  }

  if (rawState.schemaVersion === 2) {
    const v3 = migrateV2ToV3(rawState);
    const v4 = migrateV3ToV4(v3);
    return createGameState(v4);
  }

  if (rawState.schemaVersion === 1 || rawState.schemaVersion == null) {
    const v2 = migrateV1ToV2(rawState, fallbackSeed);
    const v3 = migrateV2ToV3(v2);
    const v4 = migrateV3ToV4(v3);
    return createGameState(v4);
  }

  return null;
}
