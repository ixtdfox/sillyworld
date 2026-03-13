import type { RuntimeMode } from '../shared/runtimeContracts.ts';

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
