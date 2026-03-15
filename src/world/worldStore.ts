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
import { setTimeOfDay, setTimePhase, advanceTime } from './time/timeActions.ts';
import { addItemToPlayer, moveItemToSlot, removeItemFromPlayer, unequipSlot } from './inventory/inventoryActions.ts';
import { setRelationship } from './relationship/relationshipActions.ts';
import { movePlayerToNode } from './map/navigationActions.ts';
import { getAvailableRestActions, performRestAction } from './player/restActions.ts';
import { getMapConfig, getNodesForLevel, getNodeById } from './map/mapSelectors.ts';
import { canTakeItem, getInventoryWeight } from './inventory/inventorySelectors.ts';
import { getRelationship } from './relationship/relationshipSelectors.ts';
import { getTimeOfDay, getTimePhase, getWorldClock } from './time/worldSelectors.ts';
import {
  getDistrictById,
  getDistricts,
  getFactionById,
  getFactionsForPointOfInterest,
  getLocationMeta,
  getPointOfInterestById,
  getPointsOfInterestForDistrict
} from './map/settingSelectors.ts';
import { getLocationAvailability } from './map/locationAvailabilitySelectors.ts';
import { getNpcAvailability, getNpcsForLocation } from './character/npcAvailabilitySelectors.ts';
import { deserializeGameState, saveGameState, loadGameState, serializeGameState } from './worldPersistence.ts';
import { consumeNextPhaseTransition, getPendingPhaseTransitions } from './map/phaseTransitionActions.ts';

/** Определяет контракт `MovePlayerRawFailure` для согласованного взаимодействия модулей в контексте `world/worldStore`. */
interface MovePlayerRawFailure {
  ok: false;
  blockedByAvailability?: unknown;
  reason?: unknown;
}

/** Определяет контракт `MovePlayerRawSuccess` для согласованного взаимодействия модулей в контексте `world/worldStore`. */
interface MovePlayerRawSuccess {
  ok: true;
  state: GameState;
  timeCostSteps?: number;
  phaseChanged?: boolean;
  transitions?: PhaseTransitionRecord[];
}

/** Описывает тип `MovePlayerRawResult`, который формализует структуру данных в модуле `world/worldStore`. */
type MovePlayerRawResult = MovePlayerRawFailure | MovePlayerRawSuccess;

/** Определяет контракт `RestRawFailure` для согласованного взаимодействия модулей в контексте `world/worldStore`. */
interface RestRawFailure {
  ok: false;
  reason?: unknown;
}

/** Определяет контракт `RestRawSuccess` для согласованного взаимодействия модулей в контексте `world/worldStore`. */
interface RestRawSuccess {
  ok: true;
  state: GameState;
  timeCostSteps?: number;
  transitions?: PhaseTransitionRecord[];
}

/** Описывает тип `RestRawResult`, который формализует структуру данных в модуле `world/worldStore`. */
type RestRawResult = RestRawFailure | RestRawSuccess;

/** Класс `WorldStore` координирует соответствующий сценарий модуля `world/worldStore` и инкапсулирует связанную логику. */
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

  /** Возвращает `getState` внутри жизненного цикла класса. */
  getState(): GameState {
    return this.state;
  }

  /** Выполняет `subscribe` внутри жизненного цикла класса. */
  subscribe(cb: WorldStoreListener): () => boolean {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Выполняет `reset` внутри жизненного цикла класса. */
  reset(nextSeed: GameStateSeed = this.initialSeed): void {
    this.apply(createGameState(deepClone(nextSeed)));
  }

  /** Выполняет `hydrate` внутри жизненного цикла класса. */
  hydrate(json: string): boolean {
    const nextState = deserializeGameState(json, this.initialSeed);
    if (!nextState) return false;
    this.apply(nextState);
    return true;
  }

  /** Обновляет `setTimeOfDay` внутри жизненного цикла класса. */
  setTimeOfDay(nextTimeOfDay: TimeOfDay | string): void {
    this.apply(setTimeOfDay(this.state, nextTimeOfDay));
  }

  /** Обновляет `setTimePhase` внутри жизненного цикла класса. */
  setTimePhase(nextTimePhase: TimePhase | string): void {
    this.apply(setTimePhase(this.state, nextTimePhase));
  }

  /** Продвигает `advanceTime` внутри жизненного цикла класса. */
  advanceTime(): void {
    this.apply(advanceTime(this.state));
  }

  /** Возвращает `getAvailableRestActions` внутри жизненного цикла класса. */
  getAvailableRestActions(): unknown[] {
    return getAvailableRestActions(this.state);
  }

  /** Выполняет `performRestAction` внутри жизненного цикла класса. */
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
      ...(typeof result.timeCostSteps === 'number' ? { timeCostSteps: result.timeCostSteps } : {}),
      transitions: result.transitions || []
    };
  }

  /** Выполняет `movePlayerToNode` внутри жизненного цикла класса. */
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
      ...(typeof result.timeCostSteps === 'number' ? { timeCostSteps: result.timeCostSteps } : {}),
      ...(typeof result.phaseChanged === 'boolean' ? { phaseChanged: result.phaseChanged } : {}),
      transitions: result.transitions || []
    };
  }

  /** Выполняет `consumeNextPhaseTransition` внутри жизненного цикла класса. */
  consumeNextPhaseTransition(): PhaseTransitionRecord | null {
    const result: { state: GameState; transition: PhaseTransitionRecord | null } = consumeNextPhaseTransition(this.state);
    if (!result.transition) return null;
    this.apply(result.state);
    return result.transition;
  }

  /** Возвращает `getPendingPhaseTransitions` внутри жизненного цикла класса. */
  getPendingPhaseTransitions(): PhaseTransitionRecord[] {
    return getPendingPhaseTransitions(this.state);
  }

  /** Выполняет `addItemToPlayer` внутри жизненного цикла класса. */
  addItemToPlayer(instanceId: string): boolean {
    const result: { ok: boolean; state: GameState } = addItemToPlayer(this.state, instanceId);
    if (!result.ok) return false;
    this.apply(result.state);
    return true;
  }

  /** Выполняет `removeItemFromPlayer` внутри жизненного цикла класса. */
  removeItemFromPlayer(instanceId: string): boolean {
    this.apply(removeItemFromPlayer(this.state, instanceId));
    return true;
  }

  /** Выполняет `moveItemToSlot` внутри жизненного цикла класса. */
  moveItemToSlot(instanceId: string, slotId: string): boolean {
    const result: { ok: boolean; state: GameState } = moveItemToSlot(this.state, instanceId, slotId);
    if (!result.ok) return false;
    this.apply(result.state);
    return true;
  }

  /** Выполняет `unequipSlot` внутри жизненного цикла класса. */
  unequipSlot(slotId: string): void {
    this.apply(unequipSlot(this.state, slotId));
  }

  /** Обновляет `setRelationship` внутри жизненного цикла класса. */
  setRelationship(characterId: string, delta: number): number {
    const result: { nextState: GameState; level: number } = setRelationship(this.state, characterId, delta);
    this.apply(result.nextState);
    return result.level;
  }

  /** Возвращает `getRelationship` внутри жизненного цикла класса. */
  getRelationship(characterId: string): RelationshipState {
    return getRelationship(this.state, characterId);
  }

  /** Возвращает `getTimePhase` внутри жизненного цикла класса. */
  getTimePhase(): TimePhase {
    return getTimePhase(this.state);
  }

  /** Возвращает `getTimeOfDay` внутри жизненного цикла класса. */
  getTimeOfDay(): TimeOfDay {
    return getTimeOfDay(this.state);
  }

  /** Возвращает `getWorldClock` внутри жизненного цикла класса. */
  getWorldClock(): WorldClockState {
    return getWorldClock(this.state);
  }

  /** Возвращает `getMapConfig` внутри жизненного цикла класса. */
  getMapConfig(level: MapLevel): MapLevelConfigState | null {
    return getMapConfig(this.state, level);
  }

  /** Возвращает `getNodeById` внутри жизненного цикла класса. */
  getNodeById(nodeId: string): MapNodeState | null {
    return getNodeById(this.state, nodeId);
  }

  /** Возвращает `getNodesForLevel` внутри жизненного цикла класса. */
  getNodesForLevel(level: MapLevel, contextId: string | null = null): MapNodeState[] {
    return getNodesForLevel(this.state, level, contextId);
  }

  /** Возвращает `getInventoryWeight` внутри жизненного цикла класса. */
  getInventoryWeight(): number {
    return getInventoryWeight(this.state);
  }

  /** Возвращает `getDistricts` внутри жизненного цикла класса. */
  getDistricts(): DistrictState[] {
    return getDistricts(this.state);
  }

  /** Возвращает `getDistrictById` внутри жизненного цикла класса. */
  getDistrictById(districtId: string): DistrictState | null {
    return getDistrictById(this.state, districtId);
  }

  /** Возвращает `getPointOfInterestById` внутри жизненного цикла класса. */
  getPointOfInterestById(poiId: string): PointOfInterestState | null {
    return getPointOfInterestById(this.state, poiId);
  }

  /** Возвращает `getPointsOfInterestForDistrict` внутри жизненного цикла класса. */
  getPointsOfInterestForDistrict(districtId: string): PointOfInterestState[] {
    return getPointsOfInterestForDistrict(this.state, districtId);
  }

  /** Возвращает `getFactionById` внутри жизненного цикла класса. */
  getFactionById(factionId: string): FactionState | null {
    return getFactionById(this.state, factionId);
  }

  /** Возвращает `getFactionsForPointOfInterest` внутри жизненного цикла класса. */
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

  /** Возвращает `getNpcsForLocation` внутри жизненного цикла класса. */
  getNpcsForLocation(locationNodeId: string, options: { onlyAvailable?: boolean } = {}): MapNodeState[] {
    return getNpcsForLocation(this.state, locationNodeId, options);
  }

  /** Выполняет `canTakeItem` внутри жизненного цикла класса. */
  canTakeItem(instanceId: string): boolean {
    return canTakeItem(this.state, instanceId);
  }

  /** Выполняет `serialize` внутри жизненного цикла класса. */
  serialize(): string | null {
    return serializeGameState(this.state);
  }

  /** Выполняет `save` внутри жизненного цикла класса. */
  save(storage: PersistenceStorage): boolean {
    return saveGameState(storage, this.state);
  }

  /** Загружает `load` внутри жизненного цикла класса. */
  load(storage: PersistenceStorage): boolean {
    const loaded = loadGameState(storage, this.initialSeed);
    if (!loaded) return false;
    this.apply(loaded);
    return true;
  }
}

/** Создаёт и настраивает `createWorldStore` в ходе выполнения связанного игрового сценария. */
export function createWorldStore(seed: GameStateSeed = {}): WorldStore {
  return new WorldStore(seed);
}

/** Константа `worldStore` хранит общие настройки/данные, которые переиспользуются в модуле `world/worldStore`. */
export const worldStore: {
  instance: WorldStore | null;
  init(seed?: GameStateSeed): WorldStore;
  get(): WorldStore | null;
} = {
  instance: null,
  /** Выполняет `init` внутри жизненного цикла класса. */
  init(seed) {
    this.instance = createWorldStore(seed);
    return this.instance;
  },
  /** Возвращает `get` внутри жизненного цикла класса. */
  get() {
    return this.instance;
  }
};
