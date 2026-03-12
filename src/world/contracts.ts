import type { EQUIPMENT_SLOT, MAP_LEVEL, SCHEMA_VERSION, TIME_OF_DAY, TIME_PHASE } from './constants/types.js';

export type SchemaVersion = typeof SCHEMA_VERSION;

export type TimePhase = (typeof TIME_PHASE)[keyof typeof TIME_PHASE];
export type TimeOfDay = (typeof TIME_OF_DAY)[keyof typeof TIME_OF_DAY];
export type MapLevel = (typeof MAP_LEVEL)[keyof typeof MAP_LEVEL];
export type EquipmentSlot = (typeof EQUIPMENT_SLOT)[keyof typeof EQUIPMENT_SLOT];

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

export type SavePayload = GameState;

export interface WorldStoreContract {
  getState(): GameState;
  subscribe(cb: (state: GameState) => void): () => boolean;
  reset(nextSeed?: GameStateSeed): void;
  hydrate(json: string): boolean;
  serialize(): string | null;
  save(storage: PersistenceStorage): boolean;
  load(storage: PersistenceStorage): boolean;
}

export interface PersistenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
