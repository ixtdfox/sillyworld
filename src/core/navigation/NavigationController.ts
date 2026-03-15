import { MAP_LEVEL } from '../../world/constant/types.ts';
import type {
  ContextId,
  MapLevelId,
  NavigationState,
  NavigationStateSeed,
  NavigationStore,
  ScreenId
} from '../../shared/types.ts';

/** Создаёт и настраивает `createNavigationState` в ходе выполнения связанного игрового сценария. */
export function createNavigationState(seed: NavigationStateSeed = {}): NavigationState {
  return {
    screen: seed.screen ?? 'mainMenu',
    level: seed.level ?? MAP_LEVEL.City,
    contextId: seed.contextId ?? 'city:larkspur',
    navStack: seed.navStack ?? []
  };
}

/** Класс `NavigationController` координирует соответствующий сценарий модуля `core/navigation/NavigationController` и инкапсулирует связанную логику. */
export class NavigationController implements NavigationStore {
  #state: NavigationState;

  constructor(seed: NavigationStateSeed = {}) {
    this.#state = createNavigationState(seed);
  }

  /** Возвращает `getState` внутри жизненного цикла класса. */
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

  /** Выполняет `navigateToLevel` внутри жизненного цикла класса. */
  navigateToLevel(level: MapLevelId, contextId: ContextId | null): void {
    this.#state = {
      ...this.#state,
      navStack: [...this.#state.navStack, { level: this.#state.level, contextId: this.#state.contextId }],
      level,
      contextId: contextId ?? null
    };
  }

  /** Выполняет `navigateBackLevel` внутри жизненного цикла класса. */
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

  /** Выполняет `reset` внутри жизненного цикла класса. */
  reset(seedState: NavigationStateSeed = {}): void {
    this.#state = createNavigationState(seedState);
  }
}
