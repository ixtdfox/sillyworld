import type { RuntimeMode } from '../shared/runtimeContracts.ts';

export class SceneModeController {
  #mode: RuntimeMode = 'loading';

  public getMode(): RuntimeMode {
    return this.#mode;
  }

  public enterExplorationMode(): void {
    this.#mode = 'exploration';
  }

  public enterCombatMode(): void {
    this.#mode = 'combat';
  }

  public enterTransitionMode(): void {
    this.#mode = 'transitioning';
  }
}
