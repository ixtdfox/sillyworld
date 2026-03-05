export const SAVE_KEY = 'sillyrpg.save.v1';

export function createNewGameState(seed) {
  return {
    screen: 'cityMap',
    payload: null,
    navStack: [],
    world: seed,
    updatedAt: Date.now()
  };
}

export function withNavigation(game, screen, payload, navStack) {
  return {
    ...game,
    screen,
    payload: payload ?? null,
    navStack: Array.isArray(navStack) ? navStack : [],
    updatedAt: Date.now()
  };
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.debug('[SillyRPG] save failed', error);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.debug('[SillyRPG] load failed', error);
    return null;
  }
}
