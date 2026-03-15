/** Описывает тип `SchemaVersion`, который формализует структуру данных в модуле `world/contracts`. */
export type SchemaVersion = 4;

/** Описывает тип `TimePhase`, который формализует структуру данных в модуле `world/contracts`. */
export type TimePhase = import('./constant/types.ts').TimePhase;
/** Описывает тип `TimeOfDay`, который формализует структуру данных в модуле `world/contracts`. */
export type TimeOfDay = import('./constant/types.ts').TimeOfDay;
/** Описывает тип `MapLevel`, который формализует структуру данных в модуле `world/contracts`. */
export type MapLevel = import('./constant/types.ts').MapLevel;
/** Описывает тип `EquipmentSlot`, который формализует структуру данных в модуле `world/contracts`. */
export type EquipmentSlot = import('./constant/types.ts').EquipmentSlot;

/** Определяет контракт `WorldClockState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface WorldClockState {
  dayNumber: number;
  step: number;
}

/** Определяет контракт `PhaseTransitionRecord` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface PhaseTransitionRecord {
  id?: string;
  fromPhase?: TimePhase;
  toPhase?: TimePhase;
  atStep?: number;
  dayNumber?: number;
  reason?: string;
  [key: string]: unknown;
}

/** Определяет контракт `WorldPhaseTransitionState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface WorldPhaseTransitionState {
  pending: PhaseTransitionRecord[];
  history: PhaseTransitionRecord[];
}

/** Определяет контракт `WorldState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface WorldState {
  timePhase: TimePhase;
  timeOfDay: TimeOfDay;
  clock: WorldClockState;
  phaseTransitions: WorldPhaseTransitionState;
}

/** Определяет контракт `RelationshipAxesState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface RelationshipAxesState {
  trust: number;
  fear: number;
  guilt: number;
  affection: number;
  resentment: number;
  officialNarrativeLoyalty: number;
}

/** Определяет контракт `RelationshipState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface RelationshipState {
  level: number;
  tags: string[];
  stance: string;
  axes: RelationshipAxesState;
  flags: Record<string, unknown>;
  history: unknown[];
  lastInteractionAt: string | number | null;
}

/** Определяет контракт `InventoryState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface InventoryState {
  items: string[];
}

/** Определяет контракт `VitalsState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface VitalsState {
  current: number;
  max: number;
}

/** Определяет контракт `PlayerResourcesState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface PlayerResourcesState {
  cash: number;
  transitCredits: number;
}

/** Определяет контракт `PlayerState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface PlayerState {
  id: string;
  name: string;
  hp: VitalsState;
  energy: VitalsState;
  skills: Record<string, unknown>;
  professions: string[];
  currentNodeId: string;
  homeNodeId: string;
  resources: PlayerResourcesState;
  carryCapacityWeight: number;
  inventory: InventoryState;
  equipped: Partial<Record<EquipmentSlot, string>> & Record<string, string>;
  relationships: Record<string, RelationshipState>;
}

/** Определяет контракт `CharacterState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface CharacterState {
  id: string;
  name: string;
  currentNodeId: string | null;
  homeNodeId: string | null;
  meta: Record<string, unknown>;
}

/** Определяет контракт `CharactersState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface CharactersState {
  byId: Record<string, CharacterState>;
}

/** Определяет контракт `MapNodeState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface MapNodeState {
  id: string;
  name?: string;
  level: MapLevel;
  type?: string;
  parentId?: string | null;
  childrenLevel?: MapLevel;
  meta?: Record<string, unknown>;
  interactions?: string[];
  [key: string]: unknown;
}

/** Определяет контракт `MapLevelConfigState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface MapLevelConfigState {
  id: string;
  level: MapLevel;
  displayName?: string;
  nodeTypesAllowed?: string[];
  interactions?: string[];
  [key: string]: unknown;
}

/** Определяет контракт `MapsState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface MapsState {
  levelConfigs: Partial<Record<MapLevel, MapLevelConfigState>> & Record<string, MapLevelConfigState>;
  nodesById: Record<string, MapNodeState>;
}

/** Определяет контракт `ItemDefinitionState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface ItemDefinitionState {
  defId: string;
  name?: string;
  weight?: number;
  [key: string]: unknown;
}

/** Определяет контракт `ItemInstanceState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface ItemInstanceState {
  instanceId: string;
  defId: string;
  qty?: number;
  [key: string]: unknown;
}

/** Определяет контракт `ItemsState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface ItemsState {
  defsById: Record<string, ItemDefinitionState>;
  instancesById: Record<string, ItemInstanceState>;
  nodeInventory: Record<string, string[]>;
}

/** Определяет контракт `LocationAvailabilityState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface LocationAvailabilityState {
  mode: string;
  allowedPhases: TimePhase[];
  preferredPhases: TimePhase[];
  unavailableReason: string;
  restrictedProfile: string;
}

/** Определяет контракт `LocationAvailabilityResult` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface LocationAvailabilityResult {
  available: boolean;
  preferred: boolean;
  mode: string;
  reason: string;
  allowedPhases: TimePhase[];
  preferredPhases: TimePhase[];
}

/** Определяет контракт `CombinedLocationAvailability` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface CombinedLocationAvailability {
  timePhase: TimePhase;
  available: boolean;
  preferred: boolean;
  reason: string;
  district: LocationAvailabilityResult | null;
  pointOfInterest: LocationAvailabilityResult | null;
}

/** Определяет контракт `NpcAvailabilityResult` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface NpcAvailabilityResult {
  available: boolean;
  reason: string;
  requiredLocationId: string | null;
  timePhase: TimePhase;
}

/** Определяет контракт `LocationMetaState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface LocationMetaState {
  dangerLevel: string;
  accessRestrictions: string[];
  nightAccessAllowed: boolean;
  quarantineStatus: string;
  availability: LocationAvailabilityState;
}

/** Определяет контракт `DistrictState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface DistrictState {
  id: string;
  nodeId: string;
  name: string;
  zoneType: string;
  controllingFactionId: string | null;
  meta: LocationMetaState;
}

/** Определяет контракт `PointOfInterestState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface PointOfInterestState {
  id: string;
  nodeId: string;
  districtId: string | null;
  name: string;
  poiType: string;
  factionIds: string[];
  meta: LocationMetaState;
}

/** Определяет контракт `FactionState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface FactionState {
  id: string;
  name: string;
  kind: string;
  influence: string;
}

/** Определяет контракт `SettingState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface SettingState {
  districtsById: Record<string, DistrictState>;
  pointsOfInterestById: Record<string, PointOfInterestState>;
  factionsById: Record<string, FactionState>;
}

/** Определяет контракт `GameState` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface GameState {
  schemaVersion: SchemaVersion;
  world: WorldState;
  player: PlayerState;
  characters: CharactersState;
  items: ItemsState;
  maps: MapsState;
  setting: SettingState;
  updatedAt: number;
}

/** Описывает тип `GameStateSeed`, который формализует структуру данных в модуле `world/contracts`. */
export type GameStateSeed = Partial<GameState> & Record<string, unknown>;
/** Определяет контракт `SavePayload` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface SavePayload extends GameState {}

/** Определяет контракт `PersistenceStorage` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface PersistenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Определяет контракт `RestActionResult` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface RestActionResult {
  ok: false;
  reason: string;
}

/** Определяет контракт `RestActionSuccess` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface RestActionSuccess {
  ok: true;
  timeCostSteps?: number;
  transitions: PhaseTransitionRecord[];
}

/** Описывает тип `RestActionResponse`, который формализует структуру данных в модуле `world/contracts`. */
export type RestActionResponse = RestActionResult | RestActionSuccess;

/** Определяет контракт `MovePlayerFailure` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface MovePlayerFailure {
  ok: false;
  blockedByAvailability: boolean;
  reason: string;
}

/** Определяет контракт `MovePlayerSuccess` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface MovePlayerSuccess {
  ok: true;
  timeCostSteps?: number;
  phaseChanged?: boolean;
  transitions: PhaseTransitionRecord[];
}

/** Описывает тип `MovePlayerResponse`, который формализует структуру данных в модуле `world/contracts`. */
export type MovePlayerResponse = MovePlayerFailure | MovePlayerSuccess;

/** Описывает тип `WorldStoreListener`, который формализует структуру данных в модуле `world/contracts`. */
export type WorldStoreListener = (state: GameState) => void;

/** Определяет контракт `WorldStoreContract` для согласованного взаимодействия модулей в контексте `world/contracts`. */
export interface WorldStoreContract {
  getState(): GameState;
  subscribe(cb: WorldStoreListener): () => boolean;
  reset(nextSeed?: GameStateSeed): void;
  hydrate(json: string): boolean;
  serialize(): string | null;
  save(storage: PersistenceStorage): boolean;
  load(storage: PersistenceStorage): boolean;
  setTimeOfDay(nextTimeOfDay: TimeOfDay | string): void;
  setTimePhase(nextTimePhase: TimePhase | string): void;
  advanceTime(): void;
  getAvailableRestActions(): unknown[];
  performRestAction(actionId: string): RestActionResponse;
  movePlayerToNode(nodeId: string, options?: Record<string, unknown>): MovePlayerResponse;
  consumeNextPhaseTransition(): PhaseTransitionRecord | null;
  getPendingPhaseTransitions(): PhaseTransitionRecord[];
  addItemToPlayer(instanceId: string): boolean;
  removeItemFromPlayer(instanceId: string): boolean;
  moveItemToSlot(instanceId: string, slotId: string): boolean;
  unequipSlot(slotId: string): void;
  setRelationship(characterId: string, delta: number): number;
  getRelationship(characterId: string): RelationshipState | null;
  getTimePhase(): TimePhase;
  getTimeOfDay(): TimeOfDay;
  getWorldClock(): WorldClockState;
  getMapConfig(level: string): unknown;
  getNodeById(nodeId: string): MapNodeState | null;
  getNodesForLevel(level: string, contextId?: string | null): MapNodeState[];
  getInventoryWeight(): number;
  getDistricts(): DistrictState[];
  getDistrictById(districtId: string): DistrictState | null;
  getPointOfInterestById(poiId: string): PointOfInterestState | null;
  getPointsOfInterestForDistrict(districtId: string): PointOfInterestState[];
  getFactionById(factionId: string): FactionState | null;
  getFactionsForPointOfInterest(poiId: string): FactionState[];
  getLocationMeta(args: { districtId?: string | null; poiId?: string | null }): LocationMetaState | null;
  getLocationAvailability(args: { districtId?: string | null; poiId?: string | null }): CombinedLocationAvailability;
  getNpcAvailability(args: { npcNodeId?: string | null; npcNode?: MapNodeState | null; locationNodeId?: string | null }): NpcAvailabilityResult;
  getNpcsForLocation(locationNodeId: string, options?: { onlyAvailable?: boolean }): MapNodeState[];
  canTakeItem(instanceId: string): boolean;
}
