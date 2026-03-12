import type { GameState, GameStateSeed, WorldStoreContract as DomainWorldStore, WorldClockState, TimePhase, PhaseTransitionRecord, PersistenceStorage as WorldPersistenceStorage } from '../world/contracts.ts';

export type ScreenId = 'mainMenu' | 'map' | 'scene' | 'settings';

export type TimePhaseId = 'morning' | 'day' | 'evening' | 'night';

export type MapLevelId = 'global' | 'region' | 'city' | 'district' | 'building' | 'room';

export type CityId = string;
export type RegionId = string;
export type DistrictId = string;
export type LocationId = string;
export type BuildingId = string;
export type RoomId = string;

export type ContextId =
  | CityId
  | RegionId
  | DistrictId
  | LocationId
  | BuildingId
  | RoomId
  | string;

export interface NavigationStackEntry {
  level: MapLevelId;
  contextId: ContextId | null;
}

export type MapLevelContext = NavigationStackEntry;

export interface NavigationState {
  screen: ScreenId;
  level: MapLevelId;
  contextId: ContextId | null;
  navStack: NavigationStackEntry[];
}

export type NavigationStateSeed = Partial<NavigationState>;

export interface NavigationStore {
  getState(): NavigationState;
  setScreen(screen: ScreenId): void;
  setContextId(contextId: ContextId | null): void;
  navigateToLevel(level: MapLevelId, contextId: ContextId | null): void;
  navigateBackLevel(): boolean;
  reset(seedState?: NavigationStateSeed): void;
}

export interface PhasePresentation {
  key: TimePhaseId | string;
  label: string;
  hint: string;
  dayNumber: number;
}

export interface PersistenceStorage extends WorldPersistenceStorage {
  removeItem(key: string): void;
}

export interface PersistenceKeys {
  worldSave: string;
}

export interface PersistenceContract {
  storage: PersistenceStorage;
  keys: PersistenceKeys;
  hasSaveData(): boolean;
}

export type WorldSeed = GameStateSeed;

export type SeedLoader = (seedPath?: string) => Promise<WorldSeed>;

export interface WorldStore extends DomainWorldStore {
  getTimePhase(): TimePhaseId | TimePhase;
  getWorldClock(): WorldClockState | null;
  getPendingPhaseTransitions(): PhaseTransitionRecord[];
  consumeNextPhaseTransition(): PhaseTransitionRecord | null;
  getState(): GameState;
  save(storage: PersistenceStorage): boolean;
  load(storage: PersistenceStorage): boolean;
  reset(seed?: WorldSeed): void;
}


export type WorldClockSnapshot = WorldClockState;

export interface WorldStoreStateSnapshot {
  player: {
    currentNodeId: ContextId;
  };
  maps: {
    nodesById: {
      [nodeId: string]: {
        parentId?: ContextId | null;
      };
    };
  };
}
export interface WorldStoreModule {
  get(): WorldStore | null;
  init(seed: WorldSeed): WorldStore;
}

export interface SceneTransitionController {
  onMapPinClick(regionId: RegionId): void;
}

export interface SceneTransitionPayload {
  regionId: RegionId;
}

export type EnterSceneHandler = (payload: SceneTransitionPayload) => void;

export interface SceneTransitionControllerDeps {
  onEnterScene: EnterSceneHandler;
}

export type StateChangeCallback = () => void;

export type PhaseLabels = Readonly<Record<TimePhaseId, string>>;

export interface AppControllerState {
  seed: WorldSeed | null;
}

export interface AppController {
  navigation: NavigationStore;
  sceneTransitionController: SceneTransitionController;
  getStore(): WorldStore | null;
  getPhasePresentation(): PhasePresentation | null;
  hasSaveData(): boolean;
  back(): void;
  startNewGame(): Promise<void>;
  loadAndResumeGame(): Promise<void>;
  consumePendingPhaseTransition(): unknown;
  initialize(): Promise<void>;
}

export interface AppControllerDeps {
  worldStore: WorldStoreModule;
  mapLevel: {
    City: MapLevelId;
    District: MapLevelId;
    Building: MapLevelId;
  };
  loadSeed: SeedLoader;
  persistence: PersistenceContract;
  onStateChange?: StateChangeCallback;
}
