import { hideRoot, mountContent, createRoot } from './render/ui/mount.ts';
import { renderTopBar } from './render/ui/components/topBar.ts';
import { renderSettingsStub } from './render/ui/screens/mainMenu.ts';
import { MainMenuScreen } from './render/ui/screens/mainMenuScreen.ts';
import { renderPhaseTransitionInterstitial } from './render/ui/screens/phaseTransitionInterstitial.ts';
import { MapScreen } from './render/ui/screens/phoneMap/phoneCityMapScreen.ts';
import { SceneViewScreen } from './render/ui/screens/sceneViewScreen.ts';
import { ScreenManager } from './render/ui/screens/screenSystem.ts';
import { MAP_LEVEL, worldStore } from './world';
import { createStandalonePersistence } from './platform/browser/localPersistence.ts';
import { loadSeed } from './platform/browser/seedLoader.ts';
import type { AppController as AppControllerContract, RegionId } from './shared/types.ts';
import type { PhaseTransitionRecord } from './world';
import { AppController } from './core/app/AppController.ts';

const APP_TITLE = 'SillyRPG';

class ApplicationSession {
  readonly #controller: AppControllerContract;
  readonly #screenManager = new ScreenManager();

  constructor(controller: AppControllerContract) {
    this.#controller = controller;
  }

  async start(): Promise<void> {
    console.info('[SillyRPG] Mounting application root.');
    createRoot();
    await this.#controller.initialize();
    console.info('[SillyRPG] Startup complete.');
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
      renderTopBar({ title: APP_TITLE, breadcrumb, phaseInfo, onBack: () => this.back(), onExit: () => this.exit(), canGoBack, hideExit: true }),
      content
    );

    mountContent(box);
    this.renderScreenBody(content);
  }

  private back(): void {
    this.#controller.back();
  }

  private exit(): void {
    this.#screenManager.clear();
    hideRoot();
  }

  private renderScreenBody(content: HTMLElement): void {
    const nav = this.#controller.navigation.getState();
    if (nav.screen === 'settings') {
      this.#screenManager.clear(content);
      content.replaceChildren(renderSettingsStub({ onBack: () => this.back() }));
      return;
    }

    if (nav.screen === 'scene') {
      const sceneLaunchOptions = this.#controller.getSceneLaunchOptions();
      const sceneProps = {
        ...(nav.contextId ? { districtId: nav.contextId } : {}),
        ...(sceneLaunchOptions ?? {})
      };
      this.#screenManager.mount(content, new SceneViewScreen(sceneProps));
      return;
    }

    if (nav.screen === 'map') {
      const store = this.#controller.getStore();
      if (store) {
        const [transition]: Array<PhaseTransitionRecord | undefined> = store.getPendingPhaseTransitions();
        if (transition) {
          this.#screenManager.clear(content);
          content.replaceChildren(renderPhaseTransitionInterstitial({ transition, onContinue: () => this.#controller.consumePendingPhaseTransition() }));
          return;
        }

        this.#screenManager.mount(content, new MapScreen({
          onRegionOpen: (regionId: RegionId) => this.#controller.sceneTransitionController.onMapPinClick(regionId)
        }));
        return;
      }
    }

    this.#screenManager.mount(content, new MainMenuScreen({
      onNewGame: () => this.#controller.startNewGame(),
      onContinue: () => this.#controller.loadAndResumeGame(),
      onLoadGame: () => this.#controller.loadAndResumeGame(),
      onTestCombat: () => this.#controller.startCombatTest(),
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
