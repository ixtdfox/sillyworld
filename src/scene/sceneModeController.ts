import type { RuntimeMode } from '../render/shared/runtimeContracts.ts';

/** Класс `SceneModeController` координирует соответствующий сценарий модуля `scene/sceneModeController` и инкапсулирует связанную логику. */
export class SceneModeController {
  #mode: RuntimeMode = 'loading';

  public getMode(): RuntimeMode {
    return this.#mode;
  }

  #setMode(nextMode: RuntimeMode): void {
    const previousMode = this.#mode;
    if (previousMode === nextMode) {
      return;
    }

    this.#mode = nextMode;
    console.debug('[SillyRPG] Scene mode transition', { previousMode, nextMode });
  }

  public enterExplorationMode(): void {
    this.#setMode('exploration');
  }

  public enterCombatMode(): void {
    this.#setMode('combat');
  }

  public enterTransitionMode(): void {
    this.#setMode('transitioning');
  }
}
