// @ts-nocheck
import { resolveGroundClickTarget } from '../../../world/input/groundClickPolicy.ts';
import type { RuntimeDispose } from '../shared/runtimeContracts.ts';

interface Vector3Like {
  x: number;
  y: number;
  z: number;
  clone(): Vector3Like;
}

interface MovementTargetStateLike {
  clearTarget(): void;
  setTarget(nextTargetCell: { x: number; z: number }): void;
}

interface BabylonRuntimeSubset {
  BABYLON: { PointerEventTypes: { POINTERDOWN: number } };
  scene: {
    pointerX: number;
    pointerY: number;
    pick: (x: number, y: number) => { hit?: boolean; pickedMesh?: unknown; pickedPoint?: Vector3Like } | null;
    onPointerObservable: {
      add: (callback: (pointerInfo: { type: number }) => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

export class SceneGroundMovementInput {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #movementTargetState: MovementTargetStateLike;
  readonly #gridMapper: { worldToGridCell: (worldPosition: { x: number; z: number }) => { x: number; z: number } };
  #observer: unknown | null = null;

  constructor(
    runtime: BabylonRuntimeSubset,
    movementTargetState: MovementTargetStateLike,
    gridMapper?: { worldToGridCell: (worldPosition: { x: number; z: number }) => { x: number; z: number } }
  ) {
    this.#runtime = runtime;
    this.#movementTargetState = movementTargetState;
    this.#gridMapper = gridMapper ?? { worldToGridCell: (worldPosition) => worldPosition };
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
      const resolution = resolveGroundClickTarget(pickResult);

      if (!resolution.accepted || !resolution.target) {
        this.#movementTargetState.clearTarget();
        return;
      }

      const targetCell = this.#gridMapper.worldToGridCell(resolution.target);
      this.#movementTargetState.setTarget(targetCell);
    });

    return () => this.dispose();
  }

  public dispose(): void {
    if (this.#observer) {
      this.#runtime.scene.onPointerObservable.remove(this.#observer);
      this.#observer = null;
    }
  }
}

export function attachSceneGroundMovementInput(
  runtime: BabylonRuntimeSubset,
  movementTargetState: MovementTargetStateLike,
  gridMapper?: { worldToGridCell: (worldPosition: { x: number; z: number }) => { x: number; z: number } }
): RuntimeDispose {
  const input = new SceneGroundMovementInput(runtime, movementTargetState, gridMapper);
  return input.attach();
}
