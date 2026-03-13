// @ts-nocheck
import type { PositionLike, PositionNodeLike } from '../../../world/spatial/types.ts';

export type RuntimeMode = 'loading' | 'transitioning' | 'exploration' | 'combat';

export type RuntimeDispose = () => void;

export type AssetResolver = (assetPath: string) => string;

export interface NormalizationDebugInfo {
  entityId: string | null;
  targetHeight: number | null;
  currentHeight: number | null;
  scaleFactor: number | null;
  collisionRadius: number | null;
  collisionHeight: number | null;
  attackRange: number | null;
}

export interface RuntimeNormalizationState {
  player: NormalizationDebugInfo | null;
  enemy: NormalizationDebugInfo | null;
}

export interface ExplorationDebugState {
  playerPosition: PositionLike | null;
  enemyPosition: PositionLike | null;
  distanceToEnemy: number | null;
  enemyInteractionAllowed: boolean;
  enemyPerceptionDetected?: boolean;
  enemyPerceptionReason?: string | null;
  enemyPerceptionDistance?: number | null;
  enemyPerceptionAngle?: number | null;
  enemyAiState?: string | null;
  enemyPatrolPointIndex?: number | null;
  enemyPatrolTarget?: PositionLike | null;
  normalization: RuntimeNormalizationState | null;
}

export interface CombatDebugState {
  state: string | null;
  phase: string | null;
  round: number | null;
  activeUnit: string | null;
  turnOwner: string | null;
  actionMode: string | null;
  activeUnitAp: number | null;
  activeUnitMp: number | null;
  playerHp: number | null;
  playerAp: number | null;
  playerMp: number | null;
  enemyHp: number | null;
  enemyAp: number | null;
  enemyMp: number | null;
}

export interface RuntimeDebugState {
  mode: RuntimeMode;
  exploration?: ExplorationDebugState;
  combat?: CombatDebugState;
  normalization?: RuntimeNormalizationState | null;
}

export interface EncounterInteractionPayload {
  playerRoot: PositionNodeLike;
  enemyRoot: PositionNodeLike;
  distanceToEnemy: number;
  interactionDistance: number;
}

export interface EncounterStartPayload extends EncounterInteractionPayload {
  combatState?: CombatStateLike;
}

export interface CombatUnitLike {
  id: string;
  displayName?: string;
  team?: string;
  hp?: number;
  ap?: number;
  mp?: number;
}

export interface CombatStateLike {
  status?: string;
  phase?: string;
  inputMode?: string;
  turn?: { roundNumber?: number } | null;
  units?: {
    player?: { hp?: number; ap?: number; mp?: number };
    enemy?: { hp?: number; ap?: number; mp?: number };
  };
  getActiveUnit?: () => CombatUnitLike | null;
}

export interface SceneRuntimeMountOptions {
  districtId?: string;
  interactionDistance?: number;
  debugEnabled?: boolean;
  sceneFile?: string;
  playerFile?: string;
  enemyFile?: string;
  enemySpawn?: { x: number; z: number };
  playerNormalizationId?: string;
  enemyNormalizationId?: string;
  enemyArchetypeId?: string;
  enemyVisionAngleDegrees?: number;
  enemyVisionDistance?: number;
  enemyFacingDirection?: { x: number; y: number; z: number };
  enemyPatrolPoints?: { x: number; y?: number; z: number }[];
  resolveAssetPath?: AssetResolver;
  onEncounterStart?: (payload: EncounterStartPayload) => void;
  onDebugStateChange?: (state: RuntimeDebugState) => void;
}

export type SceneRuntimeMount = (
  canvas: HTMLCanvasElement,
  options?: SceneRuntimeMountOptions
) => Promise<RuntimeDispose>;
