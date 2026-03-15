/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import type { GameState, GameStateSeed, PersistenceStorage, SavePayload } from './contracts.ts';
import { migrateGameState } from './worldMigrations.ts';
import { PERSISTENCE_KEYS } from '../platform/browser/localPersistence.ts';

/** Константа `SAVE_KEY` хранит общие настройки/данные, которые переиспользуются в модуле `world/worldPersistence`. */
export const SAVE_KEY = PERSISTENCE_KEYS.worldSave;

/** Определяет контракт `GameStatePersistenceContract` для согласованного взаимодействия модулей в контексте `world/worldPersistence`. */
export interface GameStatePersistenceContract {
  serialize(state: SavePayload): string | null;
  deserialize(json: string, fallbackSeed?: GameStateSeed): GameState | null;
  save(storage: PersistenceStorage, state: SavePayload, key?: string): boolean;
  load(storage: PersistenceStorage, fallbackSeed?: GameStateSeed, key?: string): GameState | null;
}

/** Класс `WorldPersistence` координирует соответствующий сценарий модуля `world/worldPersistence` и инкапсулирует связанную логику. */
export class WorldPersistence implements GameStatePersistenceContract {
  /** Выполняет `serialize` внутри жизненного цикла класса. */
  serialize(state: SavePayload): string | null {
    try {
      return JSON.stringify(state);
    } catch {
      return null;
    }
  }

  /** Выполняет `deserialize` внутри жизненного цикла класса. */
  deserialize(json: string, fallbackSeed: GameStateSeed = {}): GameState | null {
    if (typeof json !== 'string' || json.length === 0) return null;

    try {
      const parsed: unknown = JSON.parse(json);
      return migrateGameState(parsed, fallbackSeed);
    } catch {
      return null;
    }
  }

  /** Выполняет `save` внутри жизненного цикла класса. */
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

  /** Загружает `load` внутри жизненного цикла класса. */
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

/** Выполняет `serializeGameState` в ходе выполнения связанного игрового сценария. */
export function serializeGameState(state: SavePayload): string | null {
  return worldPersistence.serialize(state);
}

/** Выполняет `deserializeGameState` в ходе выполнения связанного игрового сценария. */
export function deserializeGameState(json: string, fallbackSeed: GameStateSeed = {}): GameState | null {
  return worldPersistence.deserialize(json, fallbackSeed);
}

/** Выполняет `saveGameState` в ходе выполнения связанного игрового сценария. */
export function saveGameState(storage: PersistenceStorage, state: SavePayload, key: string = SAVE_KEY): boolean {
  return worldPersistence.save(storage, state, key);
}

/** Загружает `loadGameState` в ходе выполнения связанного игрового сценария. */
export function loadGameState(storage: PersistenceStorage, fallbackSeed: GameStateSeed = {}, key: string = SAVE_KEY): GameState | null {
  return worldPersistence.load(storage, fallbackSeed, key);
}
