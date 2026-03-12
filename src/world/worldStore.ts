import { createGameState } from './worldState.ts';
import type {
  CombinedLocationAvailability,
  DistrictState,
  FactionState,
  GameState,
  GameStateSeed,
  LocationMetaState,
  MapLevel,
  MapLevelConfigState,
  MapNodeState,
  MovePlayerResponse,
  NpcAvailabilityResult,
  PersistenceStorage,
  PhaseTransitionRecord,
  PointOfInterestState,
  RelationshipState,
  RestActionResponse,
  TimeOfDay,
  TimePhase,
  WorldClockState,
  WorldStoreContract,
  WorldStoreListener
} from './contracts.ts';
import { deepClone } from './utils/object.ts';
import { setTimeOfDay, setTimePhase, advanceTime } from './actions/timeActions.ts';
import { addItemToPlayer, moveItemToSlot, removeItemFromPlayer, unequipSlot } from './actions/inventoryActions.ts';
import { setRelationship } from './actions/relationshipActions.ts';
import { movePlayerToNode } from './actions/navigationActions.ts';
import { getAvailableRestActions, performRestAction } from './actions/restActions.ts';
import { getMapConfig, getNodesForLevel, getNodeById } from './selectors/mapSelectors.ts';
import { canTakeItem, getInventoryWeight } from './selectors/inventorySelectors.ts';
import { getRelationship } from './selectors/relationshipSelectors.ts';
import { getTimeOfDay, getTimePhase, getWorldClock } from './selectors/worldSelectors.ts';
import {
  getDistrictById,
  getDistricts,
  getFactionById,
  getFactionsForPointOfInterest,
  getLocationMeta,
  getPointOfInterestById,
  getPointsOfInterestForDistrict
} from './selectors/settingSelectors.ts';
import { getLocationAvailability } from './selectors/locationAvailabilitySelectors.ts';
import { getNpcAvailability, getNpcsForLocation } from './selectors/npcAvailabilitySelectors.ts';
import { deserializeGameState, saveGameState, loadGameState, serializeGameState } from './worldPersistence.ts';
import { consumeNextPhaseTransition, getPendingPhaseTransitions } from './actions/phaseTransitionActions.ts';

interface MovePlayerRawFailure {
  ok: false;
  blockedByAvailability?: unknown;
  reason?: unknown;
}

interface MovePlayerRawSuccess {
  ok: true;
  state: GameState;
  timeCostSteps?: number;
  phaseChanged?: boolean;
  transitions?: PhaseTransitionRecord[];
}

type MovePlayerRawResult = MovePlayerRawFailure | MovePlayerRawSuccess;

interface RestRawFailure {
  ok: false;
  reason?: unknown;
}

interface RestRawSuccess {
  ok: true;
  state: GameState;
  timeCostSteps?: number;
  transitions?: PhaseTransitionRecord[];
}

type RestRawResult = RestRawFailure | RestRawSuccess;

export class WorldStore implements WorldStoreContract {
  private readonly initialSeed: GameStateSeed;
  private state: GameState;
  private readonly listeners = new Set<WorldStoreListener>();

  constructor(seed: GameStateSeed = {}) {
    this.initialSeed = seed;
    this.state = createGameState(deepClone(seed));
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb(this.state));
  }

  private apply(nextState: GameState): void {
    this.state = nextState;
    this.notify();
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(cb: WorldStoreListener): () => boolean {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  reset(nextSeed: GameStateSeed = this.initialSeed): void {
    this.apply(createGameState(deepClone(nextSeed)));
  }

  hydrate(json: string): boolean {
    const nextState = deserializeGameState(json, this.initialSeed);
    if (!nextState) return false;
    this.apply(nextState);
    return true;
  }

  setTimeOfDay(nextTimeOfDay: TimeOfDay | string): void {
    this.apply(setTimeOfDay(this.state, nextTimeOfDay));
  }

  setTimePhase(nextTimePhase: TimePhase | string): void {
    this.apply(setTimePhase(this.state, nextTimePhase));
  }

  advanceTime(): void {
    this.apply(advanceTime(this.state));
  }

  getAvailableRestActions(): unknown[] {
    return getAvailableRestActions(this.state);
  }

  performRestAction(actionId: string): RestActionResponse {
    const result: RestRawResult = performRestAction(this.state, actionId);
    if (!result.ok) {
      return {
        ok: false,
        reason: 'reason' in result && typeof result.reason === 'string' ? result.reason : ''
      };
    }

    this.apply(result.state);
    return {
      ok: true,
      timeCostSteps: result.timeCostSteps,
      transitions: result.transitions || []
    };
  }

  movePlayerToNode(nodeId: string, options: Record<string, unknown> = {}): MovePlayerResponse {
    const result: MovePlayerRawResult = movePlayerToNode(this.state, nodeId, options);
    if (!result.ok) {
      return {
        ok: false,
        blockedByAvailability: 'blockedByAvailability' in result ? Boolean(result.blockedByAvailability) : false,
        reason: 'reason' in result && typeof result.reason === 'string' ? result.reason : ''
      };
    }

    this.apply(result.state);
    return {
      ok: true,
      timeCostSteps: result.timeCostSteps,
      phaseChanged: result.phaseChanged,
      transitions: result.transitions || []
    };
  }

  consumeNextPhaseTransition(): PhaseTransitionRecord | null {
    const result: { state: GameState; transition: PhaseTransitionRecord | null } = consumeNextPhaseTransition(this.state);
    if (!result.transition) return null;
    this.apply(result.state);
    return result.transition;
  }

  getPendingPhaseTransitions(): PhaseTransitionRecord[] {
    return getPendingPhaseTransitions(this.state);
  }

  addItemToPlayer(instanceId: string): boolean {
    const result: { ok: boolean; state: GameState } = addItemToPlayer(this.state, instanceId);
    if (!result.ok) return false;
    this.apply(result.state);
    return true;
  }

  removeItemFromPlayer(instanceId: string): boolean {
    this.apply(removeItemFromPlayer(this.state, instanceId));
    return true;
  }

  moveItemToSlot(instanceId: string, slotId: string): boolean {
    const result: { ok: boolean; state: GameState } = moveItemToSlot(this.state, instanceId, slotId);
    if (!result.ok) return false;
    this.apply(result.state);
    return true;
  }

  unequipSlot(slotId: string): void {
    this.apply(unequipSlot(this.state, slotId));
  }

  setRelationship(characterId: string, delta: number): number {
    const result: { nextState: GameState; level: number } = setRelationship(this.state, characterId, delta);
    this.apply(result.nextState);
    return result.level;
  }

  getRelationship(characterId: string): RelationshipState {
    return getRelationship(this.state, characterId);
  }

  getTimePhase(): TimePhase {
    return getTimePhase(this.state);
  }

  getTimeOfDay(): TimeOfDay {
    return getTimeOfDay(this.state);
  }

  getWorldClock(): WorldClockState {
    return getWorldClock(this.state);
  }

  getMapConfig(level: MapLevel): MapLevelConfigState | null {
    return getMapConfig(this.state, level);
  }

  getNodeById(nodeId: string): MapNodeState | null {
    return getNodeById(this.state, nodeId);
  }

  getNodesForLevel(level: MapLevel, contextId: string | null = null): MapNodeState[] {
    return getNodesForLevel(this.state, level, contextId);
  }

  getInventoryWeight(): number {
    return getInventoryWeight(this.state);
  }

  getDistricts(): DistrictState[] {
    return getDistricts(this.state);
  }

  getDistrictById(districtId: string): DistrictState | null {
    return getDistrictById(this.state, districtId);
  }

  getPointOfInterestById(poiId: string): PointOfInterestState | null {
    return getPointOfInterestById(this.state, poiId);
  }

  getPointsOfInterestForDistrict(districtId: string): PointOfInterestState[] {
    return getPointsOfInterestForDistrict(this.state, districtId);
  }

  getFactionById(factionId: string): FactionState | null {
    return getFactionById(this.state, factionId);
  }

  getFactionsForPointOfInterest(poiId: string): FactionState[] {
    return getFactionsForPointOfInterest(this.state, poiId);
  }

  getLocationMeta(args: { districtId?: string | null; poiId?: string | null }): LocationMetaState | null {
    return getLocationMeta(this.state, args);
  }

  getLocationAvailability(args: { districtId?: string | null; poiId?: string | null }): CombinedLocationAvailability {
    return getLocationAvailability(this.state, args);
  }

  getNpcAvailability(args: { npcNodeId?: string | null; npcNode?: MapNodeState | null; locationNodeId?: string | null }): NpcAvailabilityResult {
    return getNpcAvailability(this.state, args);
  }

  getNpcsForLocation(locationNodeId: string, options: { onlyAvailable?: boolean } = {}): MapNodeState[] {
    return getNpcsForLocation(this.state, locationNodeId, options);
  }

  canTakeItem(instanceId: string): boolean {
    return canTakeItem(this.state, instanceId);
  }

  serialize(): string | null {
    return serializeGameState(this.state);
  }

  save(storage: PersistenceStorage): boolean {
    return saveGameState(storage, this.state);
  }

  load(storage: PersistenceStorage): boolean {
    const loaded = loadGameState(storage, this.initialSeed);
    if (!loaded) return false;
    this.apply(loaded);
    return true;
  }
}

export function createWorldStore(seed: GameStateSeed = {}): WorldStore {
  return new WorldStore(seed);
}

export const worldStore: {
  instance: WorldStore | null;
  init(seed?: GameStateSeed): WorldStore;
  get(): WorldStore | null;
} = {
  instance: null,
  init(seed) {
    this.instance = createWorldStore(seed);
    return this.instance;
  },
  get() {
    return this.instance;
  }
};
