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

export interface NavigationState {
  screen: ScreenId;
  level: MapLevelId;
  contextId: ContextId | null;
  navStack: NavigationStackEntry[];
}

export interface PhasePresentation {
  key: TimePhaseId | string;
  label: string;
  hint: string;
  dayNumber: number;
}

export interface PersistenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

export type WorldSeed = Record<string, unknown>;

export type SeedLoader = (seedPath?: string) => Promise<WorldSeed>;

export interface WorldStore {
  getState(): any;
  getTimePhase(): TimePhaseId | string;
  getWorldClock(): { dayNumber?: number } | null;
  getPendingPhaseTransitions(): unknown[];
  consumeNextPhaseTransition(): unknown;
  save(storage: PersistenceStorage): void;
  load(storage: PersistenceStorage): boolean;
  reset(seed: WorldSeed): void;
}

export interface WorldStoreModule {
  get(): WorldStore | null;
  init(seed: WorldSeed): WorldStore;
}

export interface SceneTransitionController {
  onMapPinClick(regionId: RegionId): void;
}

export interface AppController {
  navigationStore: {
    getState(): NavigationState;
    setScreen(screen: ScreenId): void;
    setContextId(contextId: ContextId | null): void;
    navigateToLevel(level: MapLevelId, contextId: ContextId | null): void;
    navigateBackLevel(): boolean;
    reset(seedState?: Partial<NavigationState>): void;
  };
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
  onStateChange?: () => void;
}
