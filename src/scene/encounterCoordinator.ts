/**
 * Модуль runtime сцены: координирует Babylon-объекты, ввод игрока и режимы исследования/боя.
 */
import type { EncounterStartPayload } from '../render/shared/runtimeContracts.ts';

/** Класс `EncounterCoordinator` координирует соответствующий сценарий модуля `scene/encounterCoordinator` и инкапсулирует связанную логику. */
export class EncounterCoordinator {
  readonly #onEncounterStart: ((payload: EncounterStartPayload) => void) | undefined;
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
