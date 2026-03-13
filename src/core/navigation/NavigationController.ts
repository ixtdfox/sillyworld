import { MAP_LEVEL } from '../../world/constant/types.ts';
import type {
  ContextId,
  MapLevelId,
  NavigationState,
  NavigationStateSeed,
  NavigationStore,
  ScreenId
} from '../../shared/types.ts';

export function createNavigationState(seed: NavigationStateSeed = {}): NavigationState {
  return {
    screen: seed.screen ?? 'mainMenu',
    level: seed.level ?? MAP_LEVEL.City,
    contextId: seed.contextId ?? 'city:larkspur',
    navStack: seed.navStack ?? []
  };
}

export class NavigationController implements NavigationStore {
  #state: NavigationState;

  constructor(seed: NavigationStateSeed = {}) {
    this.#state = createNavigationState(seed);
  }

  getState(): NavigationState {
    return this.#state;
  }

  setScreen(screen: ScreenId): void {
    this.#state = { ...this.#state, screen };
  }

  setContextId(contextId: ContextId | null): void {
    this.#state = { ...this.#state, contextId: contextId ?? null };
  }

  navigateToLevel(level: MapLevelId, contextId: ContextId | null): void {
    this.#state = {
      ...this.#state,
      navStack: [...this.#state.navStack, { level: this.#state.level, contextId: this.#state.contextId }],
      level,
      contextId: contextId ?? null
    };
  }

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

  reset(seedState: NavigationStateSeed = {}): void {
    this.#state = createNavigationState(seedState);
  }
}
