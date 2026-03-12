import { SCHEMA_VERSION } from './constants/types.ts';
import { createGameState } from './worldState.ts';
import { normalizeTimePhase } from './actions/timeActions.ts';
import type { GameState, GameStateSeed } from './contracts.ts';

type MigratableState = Record<string, unknown> & {
  schemaVersion?: number | null;
  world?: Record<string, unknown> & { timePhase?: unknown; timeOfDay?: unknown };
};

function migrateV1ToV2(v1State: MigratableState, fallbackSeed: GameStateSeed): MigratableState {
  const base = createGameState(fallbackSeed) as unknown as MigratableState;
  return {
    ...base,
    ...v1State,
    schemaVersion: 2,
    ui: undefined
  };
}

function migrateV2ToV3(v2State: MigratableState): MigratableState {
  return { ...v2State, schemaVersion: 3 };
}

function migrateV3ToV4(v3State: MigratableState): MigratableState {
  const currentPhase = normalizeTimePhase(
    typeof v3State?.world?.timePhase === 'string' ? v3State.world.timePhase : undefined,
    normalizeTimePhase(typeof v3State?.world?.timeOfDay === 'string' ? v3State.world.timeOfDay : undefined)
  );
  return {
    ...v3State,
    schemaVersion: 4,
    world: {
      ...v3State.world,
      timePhase: currentPhase
    }
  };
}

export function migrateGameState(rawState: unknown, fallbackSeed: GameStateSeed = {}): GameState | null {
  if (!rawState || typeof rawState !== 'object') return null;
  const state = rawState as MigratableState;

  if (state.schemaVersion === SCHEMA_VERSION) return createGameState(state as unknown as GameStateSeed);
  if (state.schemaVersion === 3) return createGameState(migrateV3ToV4(state) as unknown as GameStateSeed);
  if (state.schemaVersion === 2) return createGameState(migrateV3ToV4(migrateV2ToV3(state)) as unknown as GameStateSeed);
  if (state.schemaVersion === 1 || state.schemaVersion == null) {
    return createGameState(migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(state, fallbackSeed))) as unknown as GameStateSeed);
  }
  return null;
}
