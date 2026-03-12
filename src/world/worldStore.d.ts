import type { GameState, GameStateSeed, PersistenceStorage, WorldStoreContract } from './contracts.js';

export interface RestActionResult {
  ok: boolean;
  reason?: string;
  timeCostSteps?: number;
  transitions?: unknown[];
}

export interface MovePlayerResult {
  ok: boolean;
  blockedByAvailability?: boolean;
  reason?: string;
  timeCostSteps?: number;
  phaseChanged?: boolean;
  transitions?: unknown[];
}

export interface WorldStore extends WorldStoreContract {
  setTimeOfDay(nextTimeOfDay: string): void;
  setTimePhase(nextTimePhase: string): void;
  advanceTime(): void;
  getAvailableRestActions(): unknown[];
  performRestAction(actionId: string): RestActionResult;
  movePlayerToNode(nodeId: string, options?: Record<string, unknown>): MovePlayerResult;
  consumeNextPhaseTransition(): unknown;
  getPendingPhaseTransitions(): unknown[];
  addItemToPlayer(instanceId: string): boolean;
  removeItemFromPlayer(instanceId: string): boolean;
  moveItemToSlot(instanceId: string, slotId: string): boolean;
  unequipSlot(slotId: string): void;
  setRelationship(characterId: string, delta: number): number;
  getRelationship(characterId: string): unknown;
  getTimePhase(): string;
  getTimeOfDay(): string;
  getWorldClock(): GameState['world']['clock'];
  getMapConfig(level: string): unknown;
  getNodeById(nodeId: string): unknown;
  getNodesForLevel(level: string, contextId?: string | null): unknown[];
  getInventoryWeight(): number;
  getDistricts(): unknown[];
  getDistrictById(districtId: string): unknown;
  getPointOfInterestById(poiId: string): unknown;
  getPointsOfInterestForDistrict(districtId: string): unknown[];
  getFactionById(factionId: string): unknown;
  getFactionsForPointOfInterest(poiId: string): unknown[];
  getLocationMeta(args: Record<string, unknown>): unknown;
  getLocationAvailability(args: Record<string, unknown>): unknown;
  getNpcAvailability(args: Record<string, unknown>): unknown;
  getNpcsForLocation(locationNodeId: string, options?: Record<string, unknown>): unknown[];
  canTakeItem(instanceId: string): boolean;
}

export function createWorldStore(seed?: GameStateSeed): WorldStore;

export const worldStore: {
  instance: WorldStore | null;
  init(seed?: GameStateSeed): WorldStore;
  get(): WorldStore | null;
};
