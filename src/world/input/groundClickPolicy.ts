/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 */
import type { PositionNodeLike } from '../spatial/types.ts';

/** Константа `DEFAULT_GROUND_MESH_NAME` хранит общие настройки/данные, которые переиспользуются в модуле `world/input/groundClickPolicy`. */
export const DEFAULT_GROUND_MESH_NAME = 'Ground';

/** Определяет контракт `GroundPickLike` для согласованного взаимодействия модулей в контексте `world/input/groundClickPolicy`. */
export interface GroundPickLike {
  hit?: boolean;
  pickedMesh?: PositionNodeLike | null;
  pickedPoint?: { x: number; y: number; z: number; clone: () => { x: number; y: number; z: number } } | null;
}

/** Определяет контракт `GroundClickResolution` для согласованного взаимодействия модулей в контексте `world/input/groundClickPolicy`. */
export interface GroundClickResolution {
  accepted: boolean;
  reason: 'accepted' | 'no-hit' | 'blocked-mesh' | 'not-ground';
  pickedMeshName: string;
  target: { x: number; y: number; z: number } | null;
}

/** Выполняет `isGroundNode` в ходе выполнения связанного игрового сценария. */
function isGroundNode(node: PositionNodeLike | null | undefined, groundMeshName: string): boolean {
  let current = node;
  while (current) {
    if (current.name === groundMeshName) {
      return true;
    }
    current = current.parent ?? null;
  }
  return false;
}

/** Определяет `resolveGroundClickTarget` в ходе выполнения связанного игрового сценария. */
export function resolveGroundClickTarget(
  pickResult: GroundPickLike | null | undefined,
  options: { blockedMeshNames?: string[]; groundMeshName?: string } = {}
): GroundClickResolution {
  const groundMeshName = options.groundMeshName ?? DEFAULT_GROUND_MESH_NAME;
  const blockedMeshNames = options.blockedMeshNames ?? ['Wall'];
  const pickedMeshName = pickResult?.pickedMesh?.name ?? 'none';

  if (!pickResult?.hit || !pickResult?.pickedPoint) {
    return { accepted: false, reason: 'no-hit', pickedMeshName, target: null };
  }

  if (blockedMeshNames.includes(pickedMeshName)) {
    return { accepted: false, reason: 'blocked-mesh', pickedMeshName, target: null };
  }

  if (!isGroundNode(pickResult.pickedMesh, groundMeshName)) {
    return { accepted: false, reason: 'not-ground', pickedMeshName, target: null };
  }

  return {
    accepted: true,
    reason: 'accepted',
    pickedMeshName,
    target: pickResult.pickedPoint.clone()
  };
}
