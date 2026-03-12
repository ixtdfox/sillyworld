import { createNavigationStore } from '../navigation/navigationStore.js';
import { createSceneTransitionController } from '../navigation/sceneTransitionController.js';
import type {
  AppController,
  AppControllerDeps,
  AppControllerState,
  MapLevelContext,
  NavigationState,
  PhaseLabels,
  PhasePresentation,
  TimePhaseId,
  WorldClockSnapshot,
  WorldStore,
  WorldStoreStateSnapshot
} from '../../shared/types.js';

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

export function getPhasePresentation(store: WorldStore | null): PhasePresentation | null {
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

export function createAppController({
  worldStore,
  mapLevel,
  loadSeed,
  persistence,
  onStateChange = () => {}
}: AppControllerDeps): AppController {
  const appState: AppControllerState = { seed: null };
  const navigationStore = createNavigationStore();

  const getStore = (): WorldStore | null => worldStore.get();

  const requestRender = (): void => {
    onStateChange();
  };

  const sceneTransitionController = createSceneTransitionController({
    onEnterScene: ({ regionId }) => {
      navigationStore.setContextId(regionId);
      navigationStore.setScreen('scene');
      requestRender();
    }
  });

  async function loadSeedOnce() {
    if (appState.seed) return appState.seed;
    appState.seed = await loadSeed();
    return appState.seed;
  }

  return {
    navigationStore,
    sceneTransitionController,
    getStore,
    getPhasePresentation() {
      return getPhasePresentation(getStore());
    },
    hasSaveData() {
      return persistence.hasSaveData();
    },
    back() {
      const nav = navigationStore.getState();
      if (nav.screen === 'settings') {
        navigationStore.setScreen('mainMenu');
        requestRender();
        return;
      }

      if (nav.screen === 'scene') {
        navigationStore.setScreen('map');
        requestRender();
        return;
      }

      if (nav.screen === 'map') {
        const moved = navigationStore.navigateBackLevel();
        if (moved) requestRender();
      }
    },
    async startNewGame() {
      const seed = await loadSeedOnce();
      const store = worldStore.init(seed);
      store.reset(seed);
      const state = store.getState();
      navigationStore.reset(buildMapNavState(state, mapLevel));
      store.save(persistence.storage);
      requestRender();
    },
    async loadAndResumeGame() {
      const seed = await loadSeedOnce();
      const store = worldStore.init(seed);
      const loaded = store.load(persistence.storage);
      if (loaded) {
        const state = store.getState();
        navigationStore.reset(buildMapNavState(state, mapLevel));
      }
      requestRender();
    },
    consumePendingPhaseTransition() {
      const store = getStore();
      if (!store) return null;
      const transition = store.consumeNextPhaseTransition();
      store.save(persistence.storage);
      requestRender();
      return transition;
    },
    async initialize() {
      await loadSeedOnce();
      requestRender();
    }
  };
}
