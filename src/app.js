import { hideRoot, mountContent, showRoot } from './ui/mount.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderMapLevelView } from './ui/screens/mapLevelView.js';
import { renderPhaseTransitionInterstitial } from './ui/screens/phaseTransitionInterstitial.js';
import { openNpcChat } from './st_bridge/chatLauncher.js';
import { notify } from './st_bridge/stApi.js';
import { MAP_LEVEL, SAVE_KEY, worldStore } from './world/index.js';
import { createNavigationStore } from './ui/state/navigationStore.js';

const appState = { seed: null };
const navigationStore = createNavigationStore();

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

  if (nav.screen === 'map') {
    const moved = navigationStore.navigateBackLevel();
    if (moved) render();
  }
}

function exit() {
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

function getChildLevel(level) {
  if (level === MAP_LEVEL.City) return MAP_LEVEL.District;
  if (level === MAP_LEVEL.District) return MAP_LEVEL.Building;
  return MAP_LEVEL.Room;
}


function getRestActionsForContext(store, nav, contextNode) {
  if (!contextNode || nav.level !== MAP_LEVEL.Building) return [];
  if (contextNode.id !== store.getState().player.homeNodeId) return [];
  return store.getAvailableRestActions();
}

function handleMapNodeClick(node, store) {
  if (node.type === 'action') {
    const restResult = store.performRestAction(node.id);
    if (!restResult.ok) {
      notify(restResult.reason || 'Cannot perform this action right now.', 'warning');
      return;
    }

    if (restResult.transitions?.length) {
      const latest = restResult.transitions[restResult.transitions.length - 1];
      notify(`Phase shift: ${latest.fromPhase} → ${latest.toPhase}`, 'info');
    }

    store.save();
    render();
    return;
  }

  if (node.type === 'npc') {
    if (node.availability && !node.availability.available) {
      notify(node.availability.reason || 'This contact is unavailable right now.', 'warning');
      return;
    }

    const parent = store.getNodeById(node.parentId);
    openNpcChat(node.meta, {
      cityName: 'Larkspur',
      districtName: parent?.name,
      locationName: parent?.name
    });
    return;
  }

  if (node.availability && !node.availability.available) {
    return;
  }

  const moved = store.movePlayerToNode(node.id);
  if (!moved.ok) return;

  if (moved.transitions?.length) {
    const latest = moved.transitions[moved.transitions.length - 1];
    notify(`Phase shift: ${latest.fromPhase} → ${latest.toPhase}`, 'info');
  }

  if (node.childrenLevel) {
    navigationStore.navigateToLevel(node.childrenLevel, node.id);
    store.save();
    render();
  }
}

function renderMapScreen(store) {
  const nav = navigationStore.getState();
  const config = store.getMapConfig(nav.level);
  const contextNode = store.getNodeById(nav.contextId);
  const nodes = store.getNodesForLevel(getChildLevel(nav.level), nav.contextId).map((node) => {
    const districtId = node.level === MAP_LEVEL.District ? node.id : node.parentId;
    const poiId = node.level === MAP_LEVEL.Building ? `poi:${node.id.split(':')[1] || node.id}` : null;
    const locationMeta =
      node.level === MAP_LEVEL.District
        ? store.getLocationMeta({ districtId: node.id })
        : node.level === MAP_LEVEL.Building
          ? store.getLocationMeta({ poiId: `poi:${node.id.split(':')[1] || node.id}` })
          : null;
    const availability = (node.level === MAP_LEVEL.District || node.level === MAP_LEVEL.Building)
      ? store.getLocationAvailability({ districtId, poiId })
      : node.type === 'npc'
        ? store.getNpcAvailability({ npcNodeId: node.id, locationNodeId: nav.contextId })
      : null;

    return {
      ...node,
      availability,
      meta: {
        ...node.meta,
        locationMeta
      }
    };
  }).filter((node) => node.type !== 'npc' || node.availability?.available !== false);

  const actions = getRestActionsForContext(store, nav, contextNode);

  return renderMapLevelView({
    config,
    contextNode,
    nodes,
    actions,
    onNodeClick: (node) => handleMapNodeClick(node, store)
  });
}

function renderScreenBody() {
  const nav = navigationStore.getState();
  if (nav.screen === 'settings') return renderSettingsStub({ onBack: back });

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

      return renderMapScreen(store);
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
  const breadcrumb = nav.screen === 'map' && store ? `${nav.level} · ${store.getTimePhase()}` : nav.screen;

  const box = document.createElement('div');
  box.className = 'sillyrpg-panel';
  box.append(
    renderTopBar({ title: 'SillyRPG', breadcrumb, onBack: back, onExit: exit, canGoBack }),
    Object.assign(document.createElement('div'), { className: 'sillyrpg-content' })
  );
  box.lastChild.appendChild(renderScreenBody());
  mountContent(box);
}

export function openApp() {
  showRoot();
  loadSeed().then(() => render());
}
