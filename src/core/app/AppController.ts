/**
 * Модуль слоя core: связывает сценарии запуска, навигацию и инфраструктурные зависимости приложения.
 */
import { NavigationController } from '../navigation/NavigationController.ts';
import { SceneTransitionController } from '../navigation/SceneTransitionController.ts';
import { COMBAT_TEST_BOOTSTRAP } from '../debug/combatTestBootstrap.ts';
import type {
  AppController as AppControllerContract,
  AppControllerDeps,
  MapLevelContext,
  NavigationState,
  PhaseLabels,
  PhasePresentation,
  TimePhaseId,
  WorldClockSnapshot,
  WorldSeed,
  WorldStore,
  WorldStoreStateSnapshot,
  SceneLaunchOptions
} from '../../shared/types.ts';

const PHASE_LABELS: PhaseLabels = Object.freeze({
  morning: 'Morning',
  day: 'Day',
  evening: 'Evening',
  night: 'Night'
});

const PHASE_HINTS: PhaseLabels = Object.freeze({
  morning: 'Most civic services are open and people are easier to find.',
  day: 'Public movement is busiest; daytime-only locations are active.',
  evening: 'Some routines wind down while night-active contacts begin to appear.',
  night: 'Night-only routes and contacts open up, while many daytime spots close.'
});

/**
 * Строит навигационное состояние карты по данным стора мира.
 * Используется после новой игры/загрузки, чтобы UI сразу открыл нужный узел иерархии
 * (город → район → текущая точка игрока).
 */
function buildMapNavState(state: WorldStoreStateSnapshot, mapLevel: AppControllerDeps['mapLevel']): NavigationState {
  const currentNodeId = state.player.currentNodeId;
  const districtId = state.maps.nodesById[currentNodeId]?.parentId ?? null;

  const navStack: MapLevelContext[] = [
    { level: mapLevel.City, contextId: 'city:larkspur' },
    { level: mapLevel.District, contextId: districtId }
  ].filter((entry): entry is MapLevelContext => Boolean(entry.contextId));

  return {
    screen: 'map',
    level: mapLevel.Building,
    contextId: currentNodeId,
    navStack
  };
}

/**
 * Центральный оркестратор запуска приложения.
 * Связывает жизненный цикл стора мира, сохранения, экранную навигацию и запуск 3D-сцены.
 */
export class AppController implements AppControllerContract {
  readonly navigation: NavigationController;
  readonly sceneTransitionController: SceneTransitionController;

  readonly #worldStore: AppControllerDeps['worldStore'];
  readonly #mapLevel: AppControllerDeps['mapLevel'];
  readonly #loadSeed: AppControllerDeps['loadSeed'];
  readonly #persistence: AppControllerDeps['persistence'];
  readonly #onStateChange: NonNullable<AppControllerDeps['onStateChange']>;

  #seed: WorldSeed | null = null;
  #sceneLaunchOptions: SceneLaunchOptions | null = null;

  constructor({ worldStore, mapLevel, loadSeed, persistence, onStateChange = () => {} }: AppControllerDeps) {
    this.#worldStore = worldStore;
    this.#mapLevel = mapLevel;
    this.#loadSeed = loadSeed;
    this.#persistence = persistence;
    this.#onStateChange = onStateChange;
    this.navigation = new NavigationController();

    this.sceneTransitionController = new SceneTransitionController({
      onEnterScene: ({ regionId }) => {
        this.navigation.setContextId(regionId);
        this.navigation.setScreen('scene');
        this.requestRender();
      }
    });
  }

  /** Возвращает активный стор мира, из которого UI и сцена читают игровое состояние. */
  getStore(): WorldStore | null {
    return this.#worldStore.get();
  }

  /**
   * Подготавливает презентационную модель времени суток для UI.
   * Здесь системные фазы переводятся в человекочитаемые подписи и подсказки верхней панели.
   */
  getPhasePresentation(): PhasePresentation | null {
    const store = this.getStore();
    if (!store) return null;

    const phaseKey = store.getTimePhase() as TimePhaseId;
    const clock: WorldClockSnapshot | null = store.getWorldClock();

    return {
      key: phaseKey,
      label: PHASE_LABELS[phaseKey] ?? phaseKey,
      hint: PHASE_HINTS[phaseKey] ?? '',
      dayNumber: clock?.dayNumber ?? 1
    };
  }

  /** Проверяет, можно ли показать пользователю сценарий «Продолжить игру». */
  hasSaveData(): boolean {
    return this.#persistence.hasSaveData();
  }

  /**
   * Реализует единый сценарий кнопки «Назад» между экранами и уровнями карты.
   * Метод меняет навигацию и инициирует перерисовку только если состояние реально изменилось.
   */
  back(): void {
    const nav = this.navigation.getState();
    if (nav.screen === 'settings') {
      this.navigation.setScreen('mainMenu');
      this.requestRender();
      return;
    }

    if (nav.screen === 'scene') {
      this.navigation.setScreen('map');
      this.requestRender();
      return;
    }

    if (nav.screen === 'map') {
      const moved = this.navigation.navigateBackLevel();
      if (moved) this.requestRender();
    }
  }

  /**
   * Запускает новую игру: загружает seed, сбрасывает стор, формирует начальную навигацию
   * и сразу сохраняет стартовое состояние как базовую точку восстановления.
   */
  async startNewGame(): Promise<void> {
    this.#sceneLaunchOptions = null;
    const seed = await this.loadSeedOnce();
    const store = this.#worldStore.init(seed);
    store.reset(seed);
    const state = store.getState();
    this.navigation.reset(buildMapNavState(state, this.#mapLevel));
    store.save(this.#persistence.storage);
    this.requestRender();
  }


  /**
   * Переводит приложение в отладочный сценарий боевого теста.
   * Подготавливает опции автозапуска боя и навигацию прямо в район, минуя карту мира.
   */
  async startCombatTest(): Promise<void> {
    const seed = await this.loadSeedOnce();
    const store = this.#worldStore.init(seed);
    store.reset(seed);

    this.#sceneLaunchOptions = {
      autoStartCombat: true,
      ...(COMBAT_TEST_BOOTSTRAP.sceneOptions.playerSpawn ? { playerSpawn: COMBAT_TEST_BOOTSTRAP.sceneOptions.playerSpawn } : {}),
      ...(COMBAT_TEST_BOOTSTRAP.sceneOptions.enemySpawn ? { enemySpawn: COMBAT_TEST_BOOTSTRAP.sceneOptions.enemySpawn } : {}),
      ...(COMBAT_TEST_BOOTSTRAP.sceneOptions.playerFacingDirection ? { playerFacingDirection: COMBAT_TEST_BOOTSTRAP.sceneOptions.playerFacingDirection } : {}),
      ...(COMBAT_TEST_BOOTSTRAP.sceneOptions.enemyFacingDirection ? { enemyFacingDirection: COMBAT_TEST_BOOTSTRAP.sceneOptions.enemyFacingDirection } : {}),
      ...(COMBAT_TEST_BOOTSTRAP.sceneOptions.skipEnemyPatrol ? { skipEnemyPatrol: COMBAT_TEST_BOOTSTRAP.sceneOptions.skipEnemyPatrol } : {})
    };

    this.navigation.reset({
      screen: 'scene',
      level: this.#mapLevel.District,
      contextId: COMBAT_TEST_BOOTSTRAP.districtId,
      navStack: [
        { level: this.#mapLevel.City, contextId: 'city:larkspur' },
        { level: this.#mapLevel.District, contextId: COMBAT_TEST_BOOTSTRAP.districtId }
      ]
    });

    this.requestRender();
  }

  /**
   * Восстанавливает сессию из persistence-слоя и синхронизирует карту с текущей позицией игрока.
   * Если сохранение отсутствует или повреждено, UI остаётся в текущем безопасном состоянии.
   */
  async loadAndResumeGame(): Promise<void> {
    this.#sceneLaunchOptions = null;
    const seed = await this.loadSeedOnce();
    const store = this.#worldStore.init(seed);
    const loaded = store.load(this.#persistence.storage);
    if (loaded) {
      const state = store.getState();
      this.navigation.reset(buildMapNavState(state, this.#mapLevel));
    }
    this.requestRender();
  }

  /**
   * Выдаёт следующее ожидающее событие смены фазы суток и удаляет его из очереди.
   * Это позволяет UI показывать интерстициальные уведомления ровно один раз.
   */
  consumePendingPhaseTransition(): unknown {
    const store = this.getStore();
    if (!store) return null;
    const transition = store.consumeNextPhaseTransition();
    store.save(this.#persistence.storage);
    this.requestRender();
    return transition;
  }

  /**
   * Выполняет ленивую инициализацию приложения перед первым рендером.
   * На этом шаге только подгружается seed и подготавливается базовое состояние контроллера.
   */
  async initialize(): Promise<void> {
    this.#sceneLaunchOptions = null;
    await this.loadSeedOnce();
    this.requestRender();
  }

  /** Отдаёт параметры следующего запуска сцены (обычный вход или тестовый бой). */
  getSceneLaunchOptions(): SceneLaunchOptions | null {
    return this.#sceneLaunchOptions;
  }

  private requestRender(): void {
    this.#onStateChange();
  }

  private async loadSeedOnce() {
    if (this.#seed) return this.#seed;
    this.#seed = await this.#loadSeed();
    return this.#seed;
  }
}
