import type { GameState, GameStateSeed, PersistenceStorage, SavePayload } from './contracts.js';

export const SAVE_KEY: string;

export function serializeGameState(state: SavePayload): string | null;
export function deserializeGameState(json: string, fallbackSeed?: GameStateSeed): GameState | null;
export function saveGameState(storage: PersistenceStorage, state: SavePayload, key?: string): boolean;
export function loadGameState(storage: PersistenceStorage, fallbackSeed?: GameStateSeed, key?: string): GameState | null;
