/** Определяет контракт `PositionLike` для согласованного взаимодействия модулей в контексте `world/spatial/types`. */
export interface PositionLike {
  x: number;
  y: number;
  z: number;
}

/** Определяет контракт `RotationLike` для согласованного взаимодействия модулей в контексте `world/spatial/types`. */
export interface RotationLike {
  x: number;
  y: number;
  z: number;
}

/** Определяет контракт `PositionNodeLike` для согласованного взаимодействия модулей в контексте `world/spatial/types`. */
export interface PositionNodeLike {
  position?: PositionLike | null;
  parent?: PositionNodeLike | null;
  name?: string;
  rotation?: RotationLike;
  rotationQuaternion?: unknown;
}
