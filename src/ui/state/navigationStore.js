import { MAP_LEVEL } from '../../world/constants/types.js';

export function createNavigationState(seed = {}) {
  return {
    screen: seed.screen || 'mainMenu',
    level: seed.level || MAP_LEVEL.City,
    contextId: seed.contextId || 'city:larkspur',
    navStack: seed.navStack || []
  };
}

export function createNavigationStore(seed = {}) {
  let state = createNavigationState(seed);

  return {
    getState() {
      return state;
    },
    setScreen(screen) {
      state = { ...state, screen };
    },
    navigateToLevel(level, contextId) {
      state = {
        ...state,
        navStack: [...state.navStack, { level: state.level, contextId: state.contextId }],
        level,
        contextId: contextId || null
      };
    },
    navigateBackLevel() {
      const prev = state.navStack[state.navStack.length - 1];
      if (!prev) return false;
      state = {
        ...state,
        navStack: state.navStack.slice(0, -1),
        level: prev.level,
        contextId: prev.contextId
      };
      return true;
    },
    reset(seedState = {}) {
      state = createNavigationState(seedState);
    }
  };
}
