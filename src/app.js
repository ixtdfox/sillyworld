import { hideRoot, mountContent, showRoot } from './ui/mount.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderMapLevelView } from './ui/screens/mapLevelView.js';
import { openNpcChat } from './st_bridge/chatLauncher.js';
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
  navigationStore.reset({ screen: 'map', level: MAP_LEVEL.City, contextId: 'city:larkspur', navStack: [] });
  store.save();
  render();
}

async function loadAndResumeGame() {
  const seed = await loadSeed();
  const store = worldStore.init(seed);
  const loaded = store.load();
  if (loaded) {
    navigationStore.reset({ screen: 'map', level: MAP_LEVEL.City, contextId: 'city:larkspur', navStack: [] });
  }
  render();
}

function getChildLevel(level) {
  if (level === MAP_LEVEL.City) return MAP_LEVEL.District;
  if (level === MAP_LEVEL.District) return MAP_LEVEL.Building;
  return MAP_LEVEL.Room;
}

function handleMapNodeClick(node, store) {
  if (node.type === 'npc') {
    const parent = store.getNodeById(node.parentId);
    openNpcChat(node.meta, {
      cityName: 'Larkspur',
      districtName: parent?.name,
      locationName: parent?.name
    });
    return;
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
  const nodes = store.getNodesForLevel(getChildLevel(nav.level), nav.contextId);

  return renderMapLevelView({
    config,
    contextNode,
    nodes,
    onNodeClick: (node) => handleMapNodeClick(node, store)
  });
}

function renderScreenBody() {
  const nav = navigationStore.getState();
  if (nav.screen === 'settings') return renderSettingsStub({ onBack: back });

  if (nav.screen === 'map') {
    const store = getStore();
    if (store) return renderMapScreen(store);
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
  const breadcrumb = nav.screen === 'map' && store ? `${nav.level} · ${store.getState().world.timeOfDay}` : nav.screen;

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
