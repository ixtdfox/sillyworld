export type SchemaVersion = 4;

export type TimePhase = import('./constants/types.ts').TimePhase;
export type TimeOfDay = import('./constants/types.ts').TimeOfDay;
export type MapLevel = import('./constants/types.ts').MapLevel;
export type EquipmentSlot = import('./constants/types.ts').EquipmentSlot;

export interface WorldClockState {
  dayNumber: number;
  step: number;
}

export interface PhaseTransitionRecord {
  id?: string;
  fromPhase?: TimePhase;
  toPhase?: TimePhase;
  atStep?: number;
  dayNumber?: number;
  reason?: string;
  [key: string]: unknown;
}

export interface WorldPhaseTransitionState {
  pending: PhaseTransitionRecord[];
  history: PhaseTransitionRecord[];
}

export interface WorldState {
  timePhase: TimePhase;
  timeOfDay: TimeOfDay;
  clock: WorldClockState;
  phaseTransitions: WorldPhaseTransitionState;
}

export interface RelationshipAxesState {
  trust: number;
  fear: number;
  guilt: number;
  affection: number;
  resentment: number;
  officialNarrativeLoyalty: number;
}

export interface RelationshipState {
  level: number;
  tags: string[];
  stance: string;
  axes: RelationshipAxesState;
  flags: Record<string, unknown>;
  history: unknown[];
  lastInteractionAt: string | number | null;
}

export interface InventoryState {
  items: string[];
}

export interface VitalsState {
  current: number;
  max: number;
}

export interface PlayerResourcesState {
  cash: number;
  transitCredits: number;
}

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

export interface CharacterState {
  id: string;
  name: string;
  currentNodeId: string | null;
  homeNodeId: string | null;
  meta: Record<string, unknown>;
}

export interface CharactersState {
  byId: Record<string, CharacterState>;
}

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

export interface MapLevelConfigState {
  id: string;
  level: MapLevel;
  displayName?: string;
  nodeTypesAllowed?: string[];
  interactions?: string[];
  [key: string]: unknown;
}

export interface MapsState {
  levelConfigs: Partial<Record<MapLevel, MapLevelConfigState>> & Record<string, MapLevelConfigState>;
  nodesById: Record<string, MapNodeState>;
}

export interface ItemDefinitionState {
  defId: string;
  name?: string;
  weight?: number;
  [key: string]: unknown;
}

export interface ItemInstanceState {
  instanceId: string;
  defId: string;
  qty?: number;
  [key: string]: unknown;
}

export interface ItemsState {
  defsById: Record<string, ItemDefinitionState>;
  instancesById: Record<string, ItemInstanceState>;
  nodeInventory: Record<string, string[]>;
}

export interface LocationAvailabilityState {
  mode: string;
  allowedPhases: TimePhase[];
  preferredPhases: TimePhase[];
  unavailableReason: string;
  restrictedProfile: string;
}

export interface LocationAvailabilityResult {
  available: boolean;
  preferred: boolean;
  mode: string;
  reason: string;
  allowedPhases: TimePhase[];
  preferredPhases: TimePhase[];
}

export interface CombinedLocationAvailability {
  timePhase: TimePhase;
  available: boolean;
  preferred: boolean;
  reason: string;
  district: LocationAvailabilityResult | null;
  pointOfInterest: LocationAvailabilityResult | null;
}

export interface NpcAvailabilityResult {
  available: boolean;
  reason: string;
  requiredLocationId: string | null;
  timePhase: TimePhase;
}

export interface LocationMetaState {
  dangerLevel: string;
  accessRestrictions: string[];
  nightAccessAllowed: boolean;
  quarantineStatus: string;
  availability: LocationAvailabilityState;
}

export interface DistrictState {
  id: string;
  nodeId: string;
  name: string;
  zoneType: string;
  controllingFactionId: string | null;
  meta: LocationMetaState;
}

export interface PointOfInterestState {
  id: string;
  nodeId: string;
  districtId: string | null;
  name: string;
  poiType: string;
  factionIds: string[];
  meta: LocationMetaState;
}

export interface FactionState {
  id: string;
  name: string;
  kind: string;
  influence: string;
}

export interface SettingState {
  districtsById: Record<string, DistrictState>;
  pointsOfInterestById: Record<string, PointOfInterestState>;
  factionsById: Record<string, FactionState>;
}

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

export type GameStateSeed = Partial<GameState> & Record<string, unknown>;
export interface SavePayload extends GameState {}

export interface PersistenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RestActionResult {
  ok: false;
  reason: string;
}

export interface RestActionSuccess {
  ok: true;
  timeCostSteps?: number;
  transitions: PhaseTransitionRecord[];
}

export type RestActionResponse = RestActionResult | RestActionSuccess;

export interface MovePlayerFailure {
  ok: false;
  blockedByAvailability: boolean;
  reason: string;
}

export interface MovePlayerSuccess {
  ok: true;
  timeCostSteps?: number;
  phaseChanged?: boolean;
  transitions: PhaseTransitionRecord[];
}

export type MovePlayerResponse = MovePlayerFailure | MovePlayerSuccess;

export type WorldStoreListener = (state: GameState) => void;

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
