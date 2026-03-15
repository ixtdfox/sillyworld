import type { CharacterIdentity, GridCell } from './CharacterIdentity.ts';
import type { CharacterRuntimeState } from './CharacterRuntimeState.ts';
import { CharacterRelations } from './CharacterRelations.ts';
import { CharacterController } from './controllers/CharacterController.ts';

/**
 * Aggregate root for runtime character behavior boundaries: identity, control ownership,
 * relationship state, and mutable gameplay state. Render/scene objects are excluded on purpose
 * so current scene runtime can keep working while systems migrate to this aggregate.
 */
export class Character {
  readonly #identity: CharacterIdentity;
  #controller: CharacterController;
  readonly #relations: CharacterRelations;
  #runtimeState: CharacterRuntimeState;

  constructor(params: {
    identity: CharacterIdentity;
    controller: CharacterController;
    relations: CharacterRelations;
    runtimeState: CharacterRuntimeState;
  }) {
    this.#identity = params.identity;
    this.#controller = params.controller;
    this.#relations = params.relations;
    this.#runtimeState = params.runtimeState;
  }

  public getId(): string {
    return this.#identity.id;
  }

  public getName(): string {
    return this.#identity.name;
  }

  public getIdentity(): CharacterIdentity {
    return { ...this.#identity };
  }

  public getController(): CharacterController {
    return this.#controller;
  }

  public setController(controller: CharacterController): void {
    this.#controller = controller;
  }

  public getRelations(): CharacterRelations {
    return this.#relations;
  }

  public getCell(): GridCell | null {
    return this.#runtimeState.cell;
  }

  public setCell(cell: GridCell | null): void {
    this.#runtimeState = {
      ...this.#runtimeState,
      cell
    };
  }

  public getRuntimeState(): CharacterRuntimeState {
    return { ...this.#runtimeState };
  }

  public setRuntimeState(runtimeState: CharacterRuntimeState): void {
    this.#runtimeState = { ...runtimeState };
  }

  public isAlive(): boolean {
    return Number.isFinite(this.#runtimeState.hpCurrent) && this.#runtimeState.hpCurrent > 0;
  }

  public isHostileToward(other: Character): boolean {
    return this.#relations.isHostileToward(other.getId());
  }
}
