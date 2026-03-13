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
  setTarget(nextTarget: Vector3Like): void;
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

export class SceneGroundClickInput {
  readonly #runtime: BabylonRuntimeSubset;
  readonly #movementTargetState: MovementTargetStateLike;
  #observer: unknown | null = null;

  constructor(runtime: BabylonRuntimeSubset, movementTargetState: MovementTargetStateLike) {
    this.#runtime = runtime;
    this.#movementTargetState = movementTargetState;
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
        console.log('[SillyRPG] Scene click rejected:', {
          reason: resolution.reason,
          pickedMeshName: resolution.pickedMeshName,
          accepted: false
        });
        return;
      }

      this.#movementTargetState.setTarget(resolution.target);
      console.log('[SillyRPG] Scene click accepted:', {
        accepted: true,
        pickedMeshName: resolution.pickedMeshName,
        x: resolution.target.x,
        y: resolution.target.y,
        z: resolution.target.z
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
}

export function attachGroundClickInput(runtime: BabylonRuntimeSubset, movementTargetState: MovementTargetStateLike): RuntimeDispose {
  const input = new SceneGroundClickInput(runtime, movementTargetState);
  return input.attach();
}
