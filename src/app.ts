import { hideRoot, mountContent, showRoot } from './ui/mount.js';
import { asScreenNode, hasScreenMount, hasScreenUnmount } from './ui/screenContract.js';
import type { ScreenNode } from './ui/screenContract.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderPhaseTransitionInterstitial } from './ui/screens/phaseTransitionInterstitial.js';
import { renderPhoneCityMapScreen } from './ui/screens/phoneMap/phoneCityMapScreen.js';
import { renderSceneViewScreen } from './ui/screens/sceneViewScreen.js';
import { MAP_LEVEL, worldStore } from './world/index.js';
import { createAppController } from './core/app/createAppController.js';
import { createStandalonePersistence } from './platform/browser/localPersistence.js';
import { loadSeed } from './platform/browser/seedLoader.js';
import type { AppController, RegionId } from './shared/types.js';
import type { PhaseTransitionRecord } from './world/contracts.js';

type ActiveScreenUnmount = (() => void) | null;

const APP_TITLE = 'SillyRPG';
let activeScreenUnmount: ActiveScreenUnmount = null;

const appController: AppController = createAppController({
  worldStore,
  mapLevel: MAP_LEVEL,
  loadSeed: () => loadSeed(),
  persistence: createStandalonePersistence(),
  onStateChange: () => render()
});

function back(): void {
  appController.back();
}

function exit(): void {
  if (activeScreenUnmount) {
    activeScreenUnmount();
    activeScreenUnmount = null;
  }

  hideRoot();
}

function renderMapScreen(): ScreenNode {
  return asScreenNode(renderPhoneCityMapScreen({
    onRegionOpen: (regionId: RegionId) => appController.sceneTransitionController.onMapPinClick(regionId)
  }));
}

function renderScreenBody(): ScreenNode {
  const nav = appController.navigationStore.getState();
  if (nav.screen === 'settings') return asScreenNode(renderSettingsStub({ onBack: back }));

  if (nav.screen === 'scene') {
    return asScreenNode(renderSceneViewScreen({
      districtId: nav.contextId,
      onEncounterStart: ({ distanceToEnemy, interactionDistance }) => {
        console.log('[SillyRPG] Transitioning exploration mode into combat mode.', {
          districtId: nav.contextId,
          distanceToEnemy,
          interactionDistance
        });
      }
    }));
  }

  if (nav.screen === 'map') {
    const store = appController.getStore();
    if (store) {
      const [transition] = store.getPendingPhaseTransitions() as Array<PhaseTransitionRecord | undefined>;
      if (transition) {
        return asScreenNode(renderPhaseTransitionInterstitial({
          transition,
          onContinue: () => {
            appController.consumePendingPhaseTransition();
          }
        }));
      }

      return renderMapScreen();
    }
  }

  return asScreenNode(renderMainMenu({
    onNewGame: () => appController.startNewGame(),
    onContinue: () => appController.loadAndResumeGame(),
    onLoadGame: () => appController.loadAndResumeGame(),
    onSettings: () => {
      appController.navigationStore.setScreen('settings');
      render();
    },
    onExit: exit,
    hasSave: appController.hasSaveData()
  }));
}

function render(): void {
  const nav = appController.navigationStore.getState();
  const store = appController.getStore();
  const canGoBack = nav.screen === 'settings' || nav.navStack.length > 0;
  const breadcrumb = nav.screen === 'map' && store ? nav.level : nav.screen;
  const phaseInfo = nav.screen === 'map' ? appController.getPhasePresentation() : null;

  const box = document.createElement('div');
  box.className = 'sillyrpg-panel';

  const content = document.createElement('div');
  content.className = 'sillyrpg-content';

  box.append(
    renderTopBar({
      title: APP_TITLE,
      breadcrumb,
      phaseInfo,
      onBack: back,
      onExit: exit,
      canGoBack,
      hideExit: true
    }),
    content
  );

  const screenNode = renderScreenBody();
  if (activeScreenUnmount) {
    activeScreenUnmount();
    activeScreenUnmount = null;
  }

  content.appendChild(screenNode);
  if (hasScreenUnmount(screenNode)) {
    activeScreenUnmount = screenNode.__sillyOnUnmount;
  }

  mountContent(box);

  if (hasScreenMount(screenNode)) {
    screenNode.__sillyOnMount();
  }
}

export async function startApp(): Promise<void> {
  console.info('[SillyRPG] Mounting application root.');
  showRoot();

  try {
    await appController.initialize();
    console.info('[SillyRPG] Startup complete.');
  } catch (error) {
    console.error('[SillyRPG] Startup failed during initialization.', error);
    throw error;
  }
}
