import { MAP_LEVEL } from '../../world/constants/types.js';

/** @typedef {import('../../shared/types').ContextId} ContextId */
/** @typedef {import('../../shared/types').MapLevelId} MapLevelId */
/** @typedef {import('../../shared/types').NavigationState} NavigationState */

/** @returns {NavigationState} */
export function createNavigationState(seed = {}) {
  return {
    screen: seed.screen || 'mainMenu',
    level: seed.level || MAP_LEVEL.City,
    contextId: seed.contextId || 'city:larkspur',
    navStack: seed.navStack || []
  };
}

export function createNavigationStore(seed = {}) {
  /** @type {NavigationState} */
  let state = createNavigationState(seed);

  return {
    /** @returns {NavigationState} */
    getState() {
      return state;
    },
    /** @param {import('../../shared/types').ScreenId} screen */
    setScreen(screen) {
      state = { ...state, screen };
    },
    /** @param {ContextId | null} contextId */
    setContextId(contextId) {
      state = { ...state, contextId: contextId || null };
    },
    /** @param {MapLevelId} level @param {ContextId | null} contextId */
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
    /** @param {Partial<NavigationState>} seedState */
    reset(seedState = {}) {
      state = createNavigationState(seedState);
    }
  };
}
