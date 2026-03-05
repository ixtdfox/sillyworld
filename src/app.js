import { hideRoot, mountContent, showRoot } from './ui/mount.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderCityMap } from './ui/screens/cityMap.js';
import { renderDistrictMap } from './ui/screens/districtMap.js';
import { renderLocationView } from './ui/screens/locationView.js';
import { openNpcChat } from './st_bridge/chatLauncher.js';
import { createNewGameState, load as loadState, save as saveState, withNavigation } from './world/worldState.js';

const DEBUG = '[SillyRPG]';

const state = {
  screen: 'mainMenu',
  payload: null,
  navStack: [],
  game: null,
  seed: null
};

async function loadSeed() {
  if (state.seed) return state.seed;
  const base = window.__SILLYRPG__?.EXT_BASE || window.location.href;
  const url = new URL('src/world/seed_world.json', base).toString();
  const response = await fetch(url);
  state.seed = await response.json();
  return state.seed;
}

function getDistrictById(districtId) {
  return state.game?.world?.city?.districts?.find((entry) => entry.id === districtId) || null;
}

function getLocationById(locationId) {
  return state.game?.world?.locations?.find((entry) => entry.id === locationId) || null;
}

function hasSaveData() {
  return Boolean(loadState());
}

function persistGame() {
  if (!state.game) return;
  state.game = withNavigation(state.game, state.screen, state.payload, state.navStack);
  saveState(state.game);
}

function navigate(screen, payload = null) {
  state.navStack.push({ screen: state.screen, payload: state.payload });
  state.screen = screen;
  state.payload = payload;
  persistGame();
  render();
}

function back() {
  const prev = state.navStack.pop();
  if (!prev) return;
  state.screen = prev.screen;
  state.payload = prev.payload;
  persistGame();
  render();
}

function exit() {
  hideRoot();
}

async function startNewGame() {
  const seed = await loadSeed();
  state.game = createNewGameState(seed);
  state.navStack = [];
  state.screen = 'cityMap';
  state.payload = null;
  persistGame();
  render();
}

function loadAndResumeGame() {
  const loaded = loadState();
  if (!loaded) return;
  state.game = loaded;
  state.screen = loaded.screen || 'cityMap';
  state.payload = loaded.payload || null;
  state.navStack = loaded.navStack || [];
  render();
}

function renderScreenBody() {
  if (state.screen === 'settings') {
    return renderSettingsStub({ onBack: back });
  }

  if (state.screen === 'cityMap') {
    return renderCityMap({
      world: state.game?.world,
      onOpenDistrict: (districtId) => navigate('districtMap', { districtId })
    });
  }

  if (state.screen === 'districtMap') {
    const district = getDistrictById(state.payload?.districtId);
    return renderDistrictMap({
      district,
      onOpenLocation: (locationId) => navigate('locationView', { locationId, districtId: district?.id })
    });
  }

  if (state.screen === 'locationView') {
    const district = getDistrictById(state.payload?.districtId);
    const location = getLocationById(state.payload?.locationId);
    return renderLocationView({
      location,
      onNpcClick: (npc) => openNpcChat(npc, {
        cityName: state.game?.world?.city?.name,
        districtName: district?.name,
        locationName: location?.name
      })
    });
  }

  return renderMainMenu({
    onNewGame: () => {
      startNewGame().catch((error) => console.debug(DEBUG, 'new game failed', error));
    },
    onContinue: loadAndResumeGame,
    onLoadGame: loadAndResumeGame,
    onSettings: () => navigate('settings'),
    onExit: exit,
    hasSave: hasSaveData()
  });
}

function render() {
  const box = document.createElement('div');
  box.className = 'sillyrpg-panel';

  const top = renderTopBar({
    title: 'SillyRPG',
    breadcrumb: state.screen,
    onBack: back,
    onExit: exit,
    canGoBack: state.navStack.length > 0
  });

  const body = document.createElement('div');
  body.className = 'sillyrpg-content';
  body.appendChild(renderScreenBody());

  box.append(top, body);
  mountContent(box);
}

export function openApp() {
  showRoot();
  if (hasSaveData() && state.screen === 'mainMenu') {
    state.screen = 'mainMenu';
  }
  render();
}
