/**
 * Общие типы и контракты между слоями приложения, чтобы UI, core и world работали согласованно.
 */
import type { GameState, GameStateSeed, WorldStoreContract as DomainWorldStore, WorldClockState, TimePhase, PhaseTransitionRecord, PersistenceStorage as WorldPersistenceStorage } from '../world/contracts.ts';

/** Идентификаторы экранов, между которыми переключается UI приложения. */
export type ScreenId = 'mainMenu' | 'map' | 'scene' | 'settings';

/** Фазы суток, используемые в календаре и доступности контента. */
export type TimePhaseId = 'morning' | 'day' | 'evening' | 'night';

/** Уровни иерархии карты мира для навигационного стека. */
export type MapLevelId = 'global' | 'region' | 'city' | 'district' | 'building' | 'room';

/** Типизированные алиасы контекстных идентификаторов на разных уровнях карты. */
export type CityId = string;
/** Идентификатор региона на мировой карте, который используется в переходе к сцене. */
export type RegionId = string;
/** Идентификатор района города; связывает карту, сцену и игровые события района. */
export type DistrictId = string;
/** Идентификатор локации (POI), на который ссылаются маршруты и доступность контента. */
export type LocationId = string;
/** Идентификатор здания внутри выбранной локации. */
export type BuildingId = string;
/** Идентификатор комнаты как самого глубокого уровня навигации карты. */
export type RoomId = string;

/** Унифицированный тип идентификатора контекста для записи в навигацию. */
export type ContextId =
  | CityId
  | RegionId
  | DistrictId
  | LocationId
  | BuildingId
  | RoomId
  | string;

/**
 * Запись одного шага навигации по иерархии карты.
 * Используется для возврата назад и восстановления контекста экрана карты.
 */
export interface NavigationStackEntry {
  level: MapLevelId;
  contextId: ContextId | null;
}

/** Контекст конкретного уровня карты, который хранится в стеке навигации. */
export type MapLevelContext = NavigationStackEntry;

/** Снимок текущего состояния навигации между экранами и уровнями карты. */
export interface NavigationState {
  screen: ScreenId;
  level: MapLevelId;
  contextId: ContextId | null;
  navStack: NavigationStackEntry[];
}

/** Частичное состояние навигации для инициализации/сброса контроллера. */
export type NavigationStateSeed = Partial<NavigationState>;

/** Контракт модуля навигации, который координирует переходы между уровнями карты. */
export interface NavigationStore {
  getState(): NavigationState;
  setScreen(screen: ScreenId): void;
  setContextId(contextId: ContextId | null): void;
  navigateToLevel(level: MapLevelId, contextId: ContextId | null): void;
  navigateBackLevel(): boolean;
  reset(seedState?: NavigationStateSeed): void;
}

/**
 * Презентационная модель текущей фазы времени.
 * Используется верхней панелью и межэкранными уведомлениями.
 */
export interface PhasePresentation {
  key: TimePhaseId | string;
  label: string;
  hint: string;
  dayNumber: number;
}

/** Расширение хранилища мира методом удаления ключа в браузерном persistence-слое. */
export interface PersistenceStorage extends WorldPersistenceStorage {
  removeItem(key: string): void;
}

/** Ключи, под которыми модули сохраняют состояние в постоянное хранилище. */
export interface PersistenceKeys {
  worldSave: string;
}

/**
 * Контракт persistence-подсистемы приложения.
 * Инкапсулирует доступ к хранилищу и проверку наличия сохранения.
 */
export interface PersistenceContract {
  storage: PersistenceStorage;
  keys: PersistenceKeys;
  hasSaveData(): boolean;
}

/** Исходный seed мира, из которого создаётся первичное состояние новой игры. */
export type WorldSeed = GameStateSeed;

/** Загрузчик стартового состояния мира (из файла или внешнего источника). */
export type SeedLoader = (seedPath?: string) => Promise<WorldSeed>;

/** Расширенный контракт стора мира для слоя приложения и UI. */
export interface WorldStore extends DomainWorldStore {
  getTimePhase(): TimePhaseId | TimePhase;
  getWorldClock(): WorldClockState;
  getPendingPhaseTransitions(): PhaseTransitionRecord[];
  consumeNextPhaseTransition(): PhaseTransitionRecord | null;
  getState(): GameState;
  save(storage: PersistenceStorage): boolean;
  load(storage: PersistenceStorage): boolean;
  reset(seed?: WorldSeed): void;
}


/** Снимок мировых часов (фаза суток и номер дня) для UI и сценарной логики. */
export type WorldClockSnapshot = WorldClockState;

/**
 * Минимальный срез состояния, который требуется UI для рендера карты и позиции игрока.
 * Применяется в местах, где не нужен полный `GameState`.
 */
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
/** Ленивый модуль инициализации стора мира для процесса запуска приложения. */
export interface WorldStoreModule {
  get(): WorldStore | null;
  init(seed: WorldSeed): WorldStore;
}

/** Координатор входа в сцену из UI карты. */
export interface SceneTransitionController {
  onMapPinClick(regionId: RegionId): void;
}

/** Полезная нагрузка перехода в сцену при выборе региона/локации. */
export interface SceneTransitionPayload {
  regionId: RegionId;
}

/** Callback, который запускает сцену после клика по карте. */
export type EnterSceneHandler = (payload: SceneTransitionPayload) => void;

/** Зависимости контроллера перехода в сцену. */
export interface SceneTransitionControllerDeps {
  onEnterScene: EnterSceneHandler;
}

/** Унифицированный callback на изменение состояния приложения. */
export type StateChangeCallback = () => void;

/** Словарь локализованных названий фаз для UI. */
export type PhaseLabels = Readonly<Record<TimePhaseId, string>>;

/** Runtime-состояние AppController, связанное с текущим seed мира. */
export interface AppControllerState {
  seed: WorldSeed | null;
}


/**
 * Параметры запуска 3D-сцены.
 * Используются в сценариях отладки и при переходе с карты в район.
 */
export interface SceneLaunchOptions {
  autoStartCombat?: boolean;
  playerSpawn?: { x: number; z: number };
  enemySpawn?: { x: number; z: number };
  playerFacingDirection?: { x: number; y: number; z: number };
  enemyFacingDirection?: { x: number; y: number; z: number };
  skipEnemyPatrol?: boolean;
}


/**
 * Главный контракт orchestration-слоя приложения.
 * Объединяет навигацию, жизненный цикл мира и сценарии старта/продолжения игры.
 */
export interface AppController {
  navigation: NavigationStore;
  sceneTransitionController: SceneTransitionController;
  getStore(): WorldStore | null;
  getPhasePresentation(): PhasePresentation | null;
  hasSaveData(): boolean;
  back(): void;
  startNewGame(): Promise<void>;
  startCombatTest(): Promise<void>;
  loadAndResumeGame(): Promise<void>;
  consumePendingPhaseTransition(): unknown;
  initialize(): Promise<void>;
  getSceneLaunchOptions(): SceneLaunchOptions | null;
}

/** Зависимости AppController, которые внедряются при инициализации standalone-приложения. */
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
