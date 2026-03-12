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

function computeDistance(BABYLON: BabylonRuntimeSubset['BABYLON'], sourceNode: PositionNodeLike, targetNode: PositionNodeLike): number {
  const source = sourceNode?.position;
  const target = targetNode?.position;

  if (!source || !target) {
    return Number.POSITIVE_INFINITY;
  }

  return BABYLON.Vector3.Distance(source, target);
}

export function attachEncounterInteractionInput(
  runtime: BabylonRuntimeSubset,
  options: EncounterInputOptions = {}
): RuntimeDispose {
  const playerRoot = options.playerRoot;
  const enemyRoot = options.enemyRoot;
  const onEncounterStart = options.onEncounterStart;
  const interactionDistance = options.interactionDistance ?? ENCOUNTER_INTERACTION_DISTANCE;
  let encounterStarted = false;

  if (!playerRoot || !enemyRoot) {
    throw new Error('Encounter interaction input requires both playerRoot and enemyRoot.');
  }

  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    const pickResult = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    if (!pickResult?.hit || !isEnemyPick({ pickedMesh: pickResult.pickedMesh, enemyRoot })) {
      return;
    }

    pointerInfo.skipOnPointerObservable = true;

    if (encounterStarted) {
      console.debug('[SillyRPG] Encounter start ignored because combat has already started.');
      return;
    }

    const distanceToEnemy = computeDistance(runtime.BABYLON, playerRoot, enemyRoot);
    if (distanceToEnemy > interactionDistance) {
      console.debug('[SillyRPG] Encounter start ignored because player is too far from enemy.', {
        distanceToEnemy,
        interactionDistance
      });
      return;
    }

    encounterStarted = true;
    onEncounterStart?.({
      playerRoot,
      enemyRoot,
      distanceToEnemy,
      interactionDistance
    });
  });

  return () => {
    runtime.scene.onPointerObservable.remove(pointerObserver);
  };
}
