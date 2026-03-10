import { hideRoot, mountContent, showRoot } from './ui/mount.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderPhaseTransitionInterstitial } from './ui/screens/phaseTransitionInterstitial.js';
import { renderPhoneCityMapScreen } from './ui/screens/phoneMap/phoneCityMapScreen.js';
import { renderSceneViewScreen } from './ui/screens/sceneViewScreen.js';
import { MAP_LEVEL, SAVE_KEY, worldStore } from './world/index.js';
import { createNavigationStore } from './ui/state/navigationStore.js';
import { createSceneTransitionController } from './ui/state/sceneTransition.js';

const appState = { seed: null };
const navigationStore = createNavigationStore();
let activeScreenUnmount = null;

const sceneTransitionController = createSceneTransitionController({
  onEnterScene: ({ regionId }) => {
    navigationStore.setContextId(regionId);
    navigationStore.setScreen('scene');
    render();
  }
});

const PHASE_LABELS = Object.freeze({
  morning: 'Morning',
  day: 'Day',
  evening: 'Evening',
  night: 'Night'
});

const PHASE_HINTS = Object.freeze({
  morning: 'Most civic services are open and people are easier to find.',
  day: 'Public movement is busiest; daytime-only locations are active.',
  evening: 'Some routines wind down while night-active contacts begin to appear.',
  night: 'Night-only routes and contacts open up, while many daytime spots close.'
});

function getPhasePresentation(store) {
  if (!store) return null;
  const phaseKey = store.getTimePhase();
  const clock = store.getWorldClock();

  return {
    key: phaseKey,
    label: PHASE_LABELS[phaseKey] || phaseKey,
    hint: PHASE_HINTS[phaseKey] || '',
    dayNumber: clock?.dayNumber || 1
  };
}

async function loadSeed() {
  if (appState.seed) return appState.seed;
  const base = window.__SILLYRPG__?.EXT_BASE || window.location.href;
  const url = new URL('src/world/seed_world.json', base).toString();
  const response = await fetch(url);
  appState.seed = await response.json();
  return appState.seed;
}

function getStore() {
  return worldStore.get();
}

function hasSaveData() {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

function back() {
  const nav = navigationStore.getState();
  if (nav.screen === 'settings') {
    navigationStore.setScreen('mainMenu');
    render();
    return;
  }

  if (nav.screen === 'scene') {
    navigationStore.setScreen('map');
    render();
    return;
  }

  if (nav.screen === 'map') {
    const moved = navigationStore.navigateBackLevel();
    if (moved) render();
  }
}

function exit() {
  if (activeScreenUnmount) {
    activeScreenUnmount();
    activeScreenUnmount = null;
  }

  hideRoot();
}

async function startNewGame() {
  const seed = await loadSeed();
  const store = worldStore.init(seed);
  store.reset(seed);
  const state = store.getState();
  navigationStore.reset({
    screen: 'map',
    level: MAP_LEVEL.Building,
    contextId: state.player.currentNodeId,
    navStack: [
      { level: MAP_LEVEL.City, contextId: 'city:larkspur' },
      { level: MAP_LEVEL.District, contextId: state.maps.nodesById[state.player.currentNodeId]?.parentId || null }
    ].filter((step) => Boolean(step.contextId))
  });
  store.save();
  render();
}

async function loadAndResumeGame() {
  const seed = await loadSeed();
  const store = worldStore.init(seed);
  const loaded = store.load();
  if (loaded) {
    const state = store.getState();
    navigationStore.reset({
      screen: 'map',
      level: MAP_LEVEL.Building,
      contextId: state.player.currentNodeId,
      navStack: [
        { level: MAP_LEVEL.City, contextId: 'city:larkspur' },
        { level: MAP_LEVEL.District, contextId: state.maps.nodesById[state.player.currentNodeId]?.parentId || null }
      ].filter((step) => Boolean(step.contextId))
    });
  }
  render();
}

function renderMapScreen() {
  return renderPhoneCityMapScreen({
    onRegionOpen: (regionId) => sceneTransitionController.onMapPinClick(regionId)
  });
}

function renderScreenBody() {
  const nav = navigationStore.getState();
  if (nav.screen === 'settings') return renderSettingsStub({ onBack: back });

  if (nav.screen === 'scene') {
    return renderSceneViewScreen({
      districtId: nav.contextId,
      onEncounterStart: ({ distanceToEnemy, interactionDistance }) => {
        console.log('[SillyRPG] Transitioning exploration mode into combat mode.', {
          districtId: nav.contextId,
          distanceToEnemy,
          interactionDistance
        });
      }
    });
  }

  if (nav.screen === 'map') {
    const store = getStore();
    if (store) {
      const transition = store.getPendingPhaseTransitions()[0];
      if (transition) {
        return renderPhaseTransitionInterstitial({
          transition,
          onContinue: () => {
            store.consumeNextPhaseTransition();
            store.save();
            render();
          }
        });
      }

      return renderMapScreen();
    }
  }

  return renderMainMenu({
    onNewGame: () => startNewGame().catch(() => {}),
    onContinue: () => loadAndResumeGame().catch(() => {}),
    onLoadGame: () => loadAndResumeGame().catch(() => {}),
    onSettings: () => {
      navigationStore.setScreen('settings');
      render();
    },
    onExit: exit,
    hasSave: hasSaveData()
  });
}

function render() {
  const nav = navigationStore.getState();
  const store = getStore();
  const canGoBack = nav.screen === 'settings' || nav.navStack.length > 0;
  const breadcrumb = nav.screen === 'map' && store ? nav.level : nav.screen;
  const phaseInfo = nav.screen === 'map' ? getPhasePresentation(store) : null;

  const box = document.createElement('div');
  box.className = 'sillyrpg-panel';
  box.append(
    renderTopBar({ title: 'SillyRPG', breadcrumb, phaseInfo, onBack: back, onExit: exit, canGoBack }),
    Object.assign(document.createElement('div'), { className: 'sillyrpg-content' })
  );
  const screenNode = renderScreenBody();
  if (activeScreenUnmount) {
    activeScreenUnmount();
    activeScreenUnmount = null;
  }

  box.lastChild.appendChild(screenNode);
  if (typeof screenNode.__sillyOnUnmount === 'function') {
    activeScreenUnmount = screenNode.__sillyOnUnmount;
  }

  mountContent(box);

  if (typeof screenNode.__sillyOnMount === 'function') {
    screenNode.__sillyOnMount();
  }
}

export function openApp() {
  showRoot();
  loadSeed().then(() => render());
}
