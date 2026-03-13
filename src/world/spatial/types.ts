export interface PositionLike {
  x: number;
  y: number;
  z: number;
}

export interface RotationLike {
  x: number;
  y: number;
  z: number;
}

export interface PositionNodeLike {
  position?: PositionLike | null;
  parent?: PositionNodeLike | null;
  name?: string;
  rotation?: RotationLike;
  rotationQuaternion?: unknown;
}
