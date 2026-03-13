import type { EncounterStartPayload } from '../shared/runtimeContracts.ts';

export class EncounterCoordinator {
  readonly #onEncounterStart?: (payload: EncounterStartPayload) => void;
  #started = false;

  constructor(onEncounterStart?: (payload: EncounterStartPayload) => void) {
    this.#onEncounterStart = onEncounterStart;
  }

  public canStartCombat(): boolean {
    return !this.#started;
  }

  public notifyCombatStarted(payload: EncounterStartPayload): void {
    this.#started = true;
    this.#onEncounterStart?.(payload);
  }

  public reset(): void {
    this.#started = false;
  }
}
