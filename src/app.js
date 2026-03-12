import { configureMount, hideRoot, mountContent, showRoot } from './ui/mount.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderPhaseTransitionInterstitial } from './ui/screens/phaseTransitionInterstitial.js';
import { renderPhoneCityMapScreen } from './ui/screens/phoneMap/phoneCityMapScreen.js';
import { renderSceneViewScreen } from './ui/screens/sceneViewScreen.js';
import { MAP_LEVEL, worldStore } from './world/index.js';
import { createAppController } from './core/app/createAppController.js';
import { createStandalonePersistence } from './platform/browser/localPersistence.js';
import { loadSeed } from './platform/browser/seedLoader.js';

let activeScreenUnmount = null;
let appOptions = {
  title: 'SillyRPG',
  onExit: null,
  isStandalone: false
};

const appController = createAppController({
  worldStore,
  mapLevel: MAP_LEVEL,
  loadSeed: () => loadSeed(),
  persistence: createStandalonePersistence(),
  onStateChange: () => render()
});

function back() {
  appController.back();
}

function exit() {
  if (activeScreenUnmount) {
    activeScreenUnmount();
    activeScreenUnmount = null;
  }

  if (typeof appOptions.onExit === 'function') {
    appOptions.onExit();
    return;
  }

  hideRoot();
}

function renderMapScreen() {
  return renderPhoneCityMapScreen({
    onRegionOpen: (regionId) => appController.sceneTransitionController.onMapPinClick(regionId)
  });
}

function renderScreenBody() {
  const nav = appController.navigationStore.getState();
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
    const store = appController.getStore();
    if (store) {
      const transition = store.getPendingPhaseTransitions()[0];
      if (transition) {
        return renderPhaseTransitionInterstitial({
          transition,
          onContinue: () => {
            appController.consumePendingPhaseTransition();
          }
        });
      }

      return renderMapScreen();
    }
  }

  return renderMainMenu({
    onNewGame: () => appController.startNewGame().catch(() => {}),
    onContinue: () => appController.loadAndResumeGame().catch(() => {}),
    onLoadGame: () => appController.loadAndResumeGame().catch(() => {}),
    onSettings: () => {
      appController.navigationStore.setScreen('settings');
      render();
    },
    onExit: exit,
    hasSave: appController.hasSaveData()
  });
}

function render() {
  const nav = appController.navigationStore.getState();
  const store = appController.getStore();
  const canGoBack = nav.screen === 'settings' || nav.navStack.length > 0;
  const breadcrumb = nav.screen === 'map' && store ? nav.level : nav.screen;
  const phaseInfo = nav.screen === 'map' ? appController.getPhasePresentation() : null;

  const box = document.createElement('div');
  box.className = 'sillyrpg-panel';
  box.append(
    renderTopBar({
      title: appOptions.title,
      breadcrumb,
      phaseInfo,
      onBack: back,
      onExit: exit,
      canGoBack,
      hideExit: appOptions.isStandalone
    }),
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

export function startApp(options = {}) {
  appOptions = {
    title: options.title || 'SillyRPG',
    onExit: typeof options.onExit === 'function' ? options.onExit : null,
    isStandalone: Boolean(options.isStandalone)
  };

  configureMount({
    rootId: options.rootId,
    rootHostSelectors: options.rootHostSelectors,
    manageExternalUi: options.manageExternalUi
  });

  showRoot();
  appController.initialize().catch(() => {});
}

export function openApp() {
  startApp();
}
