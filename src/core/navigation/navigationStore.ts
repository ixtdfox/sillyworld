import { MAP_LEVEL } from '../../world/constants/types.js';
import type {
  ContextId,
  MapLevelId,
  NavigationState,
  NavigationStateSeed,
  NavigationStore,
  ScreenId
} from '../../shared/types.js';

export function createNavigationState(seed: NavigationStateSeed = {}): NavigationState {
  return {
    screen: seed.screen ?? 'mainMenu',
    level: seed.level ?? MAP_LEVEL.City,
    contextId: seed.contextId ?? 'city:larkspur',
    navStack: seed.navStack ?? []
  };
}

export function createNavigationStore(seed: NavigationStateSeed = {}): NavigationStore {
  let state = createNavigationState(seed);

  return {
    getState(): NavigationState {
      return state;
    },
    setScreen(screen: ScreenId): void {
      state = { ...state, screen };
    },
    setContextId(contextId: ContextId | null): void {
      state = { ...state, contextId: contextId ?? null };
    },
    navigateToLevel(level: MapLevelId, contextId: ContextId | null): void {
      state = {
        ...state,
        navStack: [...state.navStack, { level: state.level, contextId: state.contextId }],
        level,
        contextId: contextId ?? null
      };
    },
    navigateBackLevel(): boolean {
      const previousEntry = state.navStack[state.navStack.length - 1];
      if (!previousEntry) return false;

      state = {
        ...state,
        navStack: state.navStack.slice(0, -1),
        level: previousEntry.level,
        contextId: previousEntry.contextId
      };
      return true;
    },
    reset(seedState: NavigationStateSeed = {}): void {
      state = createNavigationState(seedState);
    }
  };
}
