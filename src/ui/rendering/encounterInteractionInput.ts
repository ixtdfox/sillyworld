import type { EncounterInteractionPayload, PositionNodeLike, RuntimeDispose } from './runtimeContracts.js';

export const ENCOUNTER_INTERACTION_DISTANCE = 2.5;

interface BabylonRuntimeSubset {
  BABYLON: {
    PointerEventTypes: { POINTERDOWN: number };
    Vector3: { Distance: (source: unknown, target: unknown) => number };
  };
  scene: {
    pointerX: number;
    pointerY: number;
    pick: (x: number, y: number) => { hit?: boolean; pickedMesh?: unknown } | null;
    onPointerObservable: {
      add: (callback: (pointerInfo: { type: number; skipOnPointerObservable?: boolean }) => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

interface EncounterInputOptions {
  playerRoot?: PositionNodeLike;
  enemyRoot?: PositionNodeLike;
  interactionDistance?: number;
  onEncounterStart?: (payload: EncounterInteractionPayload) => void;
}

function isDescendantOf(node: { parent?: unknown } | null | undefined, candidateAncestor: unknown): boolean {
  let current: { parent?: unknown } | null = node ?? null;
  while (current) {
    if (current === candidateAncestor) {
      return true;
    }
    current = (current.parent as { parent?: unknown } | null | undefined) ?? null;
  }
  return false;
}

function isEnemyPick({ pickedMesh, enemyRoot }: { pickedMesh: unknown; enemyRoot: unknown }): boolean {
  if (!pickedMesh || !enemyRoot) {
    return false;
  }
  return pickedMesh === enemyRoot || isDescendantOf(pickedMesh as { parent?: unknown }, enemyRoot);
}

export class EncounterInteractionInput {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #playerRoot: PositionNodeLike;
  readonly #enemyRoot: PositionNodeLike;
  readonly #onEncounterStart?: (payload: EncounterInteractionPayload) => void;
  readonly #interactionDistance: number;

  #observer: unknown | null = null;
  #encounterStarted = false;

  constructor(runtime: BabylonRuntimeSubset, options: EncounterInputOptions = {}) {
    if (!options.playerRoot || !options.enemyRoot) {
      throw new Error('Encounter interaction input requires both playerRoot and enemyRoot.');
    }

    this.#runtime = runtime;
    this.#playerRoot = options.playerRoot;
    this.#enemyRoot = options.enemyRoot;
    this.#onEncounterStart = options.onEncounterStart;
    this.#interactionDistance = options.interactionDistance ?? ENCOUNTER_INTERACTION_DISTANCE;
  }

  public attach(): RuntimeDispose {
    if (this.#observer) {
      return () => this.dispose();
    }

    this.#observer = this.#runtime.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type !== this.#runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
        return;
      }

      const pickResult = this.#runtime.scene.pick(this.#runtime.scene.pointerX, this.#runtime.scene.pointerY);
      if (!pickResult?.hit || !isEnemyPick({ pickedMesh: pickResult.pickedMesh, enemyRoot: this.#enemyRoot })) {
        return;
      }

      pointerInfo.skipOnPointerObservable = true;

      if (this.#encounterStarted) {
        console.debug('[SillyRPG] Encounter start ignored because combat has already started.');
        return;
      }

      const distanceToEnemy = this.#computeDistance();
      if (distanceToEnemy > this.#interactionDistance) {
        console.debug('[SillyRPG] Encounter start ignored because player is too far from enemy.', {
          distanceToEnemy,
          interactionDistance: this.#interactionDistance
        });
        return;
      }

      this.#encounterStarted = true;
      this.#onEncounterStart?.({
        playerRoot: this.#playerRoot,
        enemyRoot: this.#enemyRoot,
        distanceToEnemy,
        interactionDistance: this.#interactionDistance
      });
    });

    return () => this.dispose();
  }

  public dispose(): void {
    if (this.#observer) {
      this.#runtime.scene.onPointerObservable.remove(this.#observer);
      this.#observer = null;
    }
  }

  #computeDistance(): number {
    const source = this.#playerRoot?.position;
    const target = this.#enemyRoot?.position;

    if (!source || !target) {
      return Number.POSITIVE_INFINITY;
    }

    return this.#runtime.BABYLON.Vector3.Distance(source, target);
  }
}

export function attachEncounterInteractionInput(runtime: BabylonRuntimeSubset, options: EncounterInputOptions = {}): RuntimeDispose {
  const input = new EncounterInteractionInput(runtime, options);
  return input.attach();
}
