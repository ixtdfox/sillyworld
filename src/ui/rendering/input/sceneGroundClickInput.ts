// @ts-nocheck
import type { RuntimeDispose } from '../shared/runtimeContracts.ts';

const GROUND_MESH_NAME = 'Ground';

interface NodeLike {
  name?: string;
  parent?: NodeLike | null;
}

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
    pick: (x: number, y: number) => { hit?: boolean; pickedMesh?: NodeLike; pickedPoint?: Vector3Like } | null;
    onPointerObservable: {
      add: (callback: (pointerInfo: { type: number }) => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

function isGroundNode(node: NodeLike | null | undefined): boolean {
  let current = node;
  while (current) {
    if (current.name === GROUND_MESH_NAME) {
      return true;
    }
    current = current.parent ?? null;
  }
  return false;
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

      const rejectClick = (reason: string, pickedMeshName: string | undefined): void => {
        this.#movementTargetState.clearTarget();
        console.log('[SillyRPG] Scene click rejected:', {
          reason,
          pickedMeshName: pickedMeshName ?? 'none',
          accepted: false
        });
      };

      const pickResult = this.#runtime.scene.pick(this.#runtime.scene.pointerX, this.#runtime.scene.pointerY);
      const pickedMeshName = pickResult?.pickedMesh?.name ?? 'none';
      console.log('[SillyRPG] Picked mesh name:', pickedMeshName);

      if (!pickResult?.hit || !pickResult.pickedPoint) {
        rejectClick('no hit', pickedMeshName);
        return;
      }

      if (pickedMeshName === 'Wall') {
        rejectClick('Wall', pickedMeshName);
        return;
      }

      if (!isGroundNode(pickResult.pickedMesh)) {
        rejectClick('not Ground', pickedMeshName);
        return;
      }

      const target = pickResult.pickedPoint.clone();
      this.#movementTargetState.setTarget(target);
      console.log('[SillyRPG] Scene click accepted:', {
        accepted: true,
        pickedMeshName,
        x: target.x,
        y: target.y,
        z: target.z
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
