import type { GameState, GameStateSeed, PersistenceStorage, SavePayload } from './contracts.js';
import { migrateGameState } from './worldMigrations.js';
import { PERSISTENCE_KEYS } from '../platform/browser/localPersistence.ts';

export const SAVE_KEY = PERSISTENCE_KEYS.worldSave;

export interface GameStatePersistenceContract {
  serialize(state: SavePayload): string | null;
  deserialize(json: string, fallbackSeed?: GameStateSeed): GameState | null;
  save(storage: PersistenceStorage, state: SavePayload, key?: string): boolean;
  load(storage: PersistenceStorage, fallbackSeed?: GameStateSeed, key?: string): GameState | null;
}

export class WorldPersistence implements GameStatePersistenceContract {
  serialize(state: SavePayload): string | null {
    try {
      return JSON.stringify(state);
    } catch {
      return null;
    }
  }

  deserialize(json: string, fallbackSeed: GameStateSeed = {}): GameState | null {
    if (typeof json !== 'string' || json.length === 0) return null;

    try {
      const parsed: unknown = JSON.parse(json);
      return migrateGameState(parsed, fallbackSeed);
    } catch {
      return null;
    }
  }

  save(storage: PersistenceStorage, state: SavePayload, key: string = SAVE_KEY): boolean {
    const serialized = this.serialize(state);
    if (!serialized) return false;

    try {
      storage.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  }

  load(storage: PersistenceStorage, fallbackSeed: GameStateSeed = {}, key: string = SAVE_KEY): GameState | null {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      return this.deserialize(raw, fallbackSeed);
    } catch {
      return null;
    }
  }
}

const worldPersistence = new WorldPersistence();

export function serializeGameState(state: SavePayload): string | null {
  return worldPersistence.serialize(state);
}

export function deserializeGameState(json: string, fallbackSeed: GameStateSeed = {}): GameState | null {
  return worldPersistence.deserialize(json, fallbackSeed);
}

export function saveGameState(storage: PersistenceStorage, state: SavePayload, key: string = SAVE_KEY): boolean {
  return worldPersistence.save(storage, state, key);
}

export function loadGameState(storage: PersistenceStorage, fallbackSeed: GameStateSeed = {}, key: string = SAVE_KEY): GameState | null {
  return worldPersistence.load(storage, fallbackSeed, key);
}
