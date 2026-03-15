/**
 * Модуль слоя core: связывает сценарии запуска, навигацию и инфраструктурные зависимости приложения. Фокус файла — навигация по карте и переходы между контекстами локаций.
 */
import { MAP_LEVEL } from '../../world/constant/types.ts';
import type {
  ContextId,
  MapLevelId,
  NavigationState,
  NavigationStateSeed,
  NavigationStore,
  ScreenId
} from '../../shared/types.ts';

/**
 * Формирует стартовый снимок навигации UI.
 * Нужен, чтобы экран карты и стек уровней всегда запускались в согласованном состоянии
 * как при холодном старте, так и после загрузки сохранения.
 */
export function createNavigationState(seed: NavigationStateSeed = {}): NavigationState {
  return {
    screen: seed.screen ?? 'mainMenu',
    level: seed.level ?? MAP_LEVEL.City,
    contextId: seed.contextId ?? 'city:larkspur',
    navStack: seed.navStack ?? []
  };
}

/**
 * Хранит и изменяет состояние экранной навигации.
 * Контроллер используется AppController и UI-слоем для переходов между главным меню,
 * картой и сценой, а также для шага «назад» по иерархии карты.
 */
export class NavigationController implements NavigationStore {
  #state: NavigationState;

  constructor(seed: NavigationStateSeed = {}) {
    this.#state = createNavigationState(seed);
  }

  /** Отдаёт текущий snapshot навигации, который читает слой рендера экранов. */
  getState(): NavigationState {
    return this.#state;
  }

  /** Обновляет `setScreen` внутри жизненного цикла класса. */
  setScreen(screen: ScreenId): void {
    this.#state = { ...this.#state, screen };
  }

  /** Обновляет `setContextId` внутри жизненного цикла класса. */
  setContextId(contextId: ContextId | null): void {
    this.#state = { ...this.#state, contextId: contextId ?? null };
  }

  /**
   * Углубляет пользователя в следующий уровень карты и запоминает предыдущий контекст в стеке.
   * Благодаря этому можно корректно вернуться назад к родительскому уровню.
   */
  navigateToLevel(level: MapLevelId, contextId: ContextId | null): void {
    this.#state = {
      ...this.#state,
      navStack: [...this.#state.navStack, { level: this.#state.level, contextId: this.#state.contextId }],
      level,
      contextId: contextId ?? null
    };
  }

  /**
   * Восстанавливает предыдущий уровень карты из navStack.
   * Возвращает `false`, когда откат невозможен (стек пуст), чтобы UI не перерисовывался лишний раз.
   */
  navigateBackLevel(): boolean {
    const previousEntry = this.#state.navStack[this.#state.navStack.length - 1];
    if (!previousEntry) return false;

    this.#state = {
      ...this.#state,
      navStack: this.#state.navStack.slice(0, -1),
      level: previousEntry.level,
      contextId: previousEntry.contextId
    };
    return true;
  }

  /** Полностью пересобирает навигационное состояние при новой игре, загрузке или тестовом запуске. */
  reset(seedState: NavigationStateSeed = {}): void {
    this.#state = createNavigationState(seedState);
  }
}
