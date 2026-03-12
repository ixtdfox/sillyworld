import { hideRoot, mountContent, showRoot } from './ui/mount.js';
import { asScreenNode, hasScreenMount, hasScreenUnmount } from './ui/screenContract.js';
import type { ScreenNode } from './ui/screenContract.js';
import { renderTopBar } from './ui/components/topBar.js';
import { renderMainMenu, renderSettingsStub } from './ui/screens/mainMenu.js';
import { renderPhaseTransitionInterstitial } from './ui/screens/phaseTransitionInterstitial.js';
import { renderPhoneCityMapScreen } from './ui/screens/phoneMap/phoneCityMapScreen.js';
import { renderSceneViewScreen } from './ui/screens/sceneViewScreen.js';
import { MAP_LEVEL, worldStore } from './world/index.js';
import { createStandalonePersistence } from './platform/browser/localPersistence.js';
import { loadSeed } from './platform/browser/seedLoader.js';
import type { AppController as AppControllerContract, RegionId } from './shared/types.js';
import type { PhaseTransitionRecord } from './world/contracts.js';
import { AppController } from './core/app/AppController.js';

type ActiveScreenUnmount = (() => void) | null;

const APP_TITLE = 'SillyRPG';

class ApplicationSession {
  readonly #controller: AppControllerContract;
  #activeScreenUnmount: ActiveScreenUnmount = null;

  constructor(controller: AppControllerContract) {
    this.#controller = controller;
  }

  async start(): Promise<void> {
    console.info('[SillyRPG] Mounting application root.');
    showRoot();

    try {
      await this.#controller.initialize();
      console.info('[SillyRPG] Startup complete.');
    } catch (error) {
      console.error('[SillyRPG] Startup failed during initialization.', error);
      throw error;
    }
  }

  render(): void {
    const nav = this.#controller.navigation.getState();
    const store = this.#controller.getStore();
    const canGoBack = nav.screen === 'settings' || nav.navStack.length > 0;
    const breadcrumb = nav.screen === 'map' && store ? nav.level : nav.screen;
    const phaseInfo = nav.screen === 'map' ? this.#controller.getPhasePresentation() : null;

    const box = document.createElement('div');
    box.className = 'sillyrpg-panel';

    const content = document.createElement('div');
    content.className = 'sillyrpg-content';

    box.append(
      renderTopBar({
        title: APP_TITLE,
        breadcrumb,
        phaseInfo,
        onBack: () => this.back(),
        onExit: () => this.exit(),
        canGoBack,
        hideExit: true
      }),
      content
    );

    const screenNode = this.renderScreenBody();
    if (this.#activeScreenUnmount) {
      this.#activeScreenUnmount();
      this.#activeScreenUnmount = null;
    }

    content.appendChild(screenNode);
    if (hasScreenUnmount(screenNode)) {
      this.#activeScreenUnmount = screenNode.__sillyOnUnmount;
    }

    mountContent(box);

    if (hasScreenMount(screenNode)) {
      screenNode.__sillyOnMount();
    }
  }

  private back(): void {
    this.#controller.back();
  }

  private exit(): void {
    if (this.#activeScreenUnmount) {
      this.#activeScreenUnmount();
      this.#activeScreenUnmount = null;
    }

    hideRoot();
  }

  private renderMapScreen(): ScreenNode {
    return asScreenNode(renderPhoneCityMapScreen({
      onRegionOpen: (regionId: RegionId) => this.#controller.sceneTransitionController.onMapPinClick(regionId)
    }));
  }

  private renderScreenBody(): ScreenNode {
    const nav = this.#controller.navigation.getState();
    if (nav.screen === 'settings') return asScreenNode(renderSettingsStub({ onBack: () => this.back() }));

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
      const store = this.#controller.getStore();
      if (store) {
        const [transition] = store.getPendingPhaseTransitions() as Array<PhaseTransitionRecord | undefined>;
        if (transition) {
          return asScreenNode(renderPhaseTransitionInterstitial({
            transition,
            onContinue: () => {
              this.#controller.consumePendingPhaseTransition();
            }
          }));
        }

        return this.renderMapScreen();
      }
    }

    return asScreenNode(renderMainMenu({
      onNewGame: () => this.#controller.startNewGame(),
      onContinue: () => this.#controller.loadAndResumeGame(),
      onLoadGame: () => this.#controller.loadAndResumeGame(),
      onSettings: () => {
        this.#controller.navigation.setScreen('settings');
        this.render();
      },
      onExit: () => this.exit(),
      hasSave: this.#controller.hasSaveData()
    }));
  }
}

const controller = new AppController({
  worldStore,
  mapLevel: MAP_LEVEL,
  loadSeed: () => loadSeed(),
  persistence: createStandalonePersistence(),
  onStateChange: () => session.render()
});

const session = new ApplicationSession(controller);

export async function startApp(): Promise<void> {
  await session.start();
}
