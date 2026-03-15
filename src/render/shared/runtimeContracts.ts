// @ts-nocheck
import type { PositionLike, PositionNodeLike } from '../../world/spatial/types.ts';

export type { PositionLike } from '../../world/spatial/types.ts';

/** Описывает тип `RuntimeMode`, который формализует структуру данных в модуле `render/shared/runtimeContracts`. */
export type RuntimeMode = 'loading' | 'transitioning' | 'exploration' | 'combat';

/** Описывает тип `RuntimeDispose`, который формализует структуру данных в модуле `render/shared/runtimeContracts`. */
export type RuntimeDispose = () => void;

/** Описывает тип `AssetResolver`, который формализует структуру данных в модуле `render/shared/runtimeContracts`. */
export type AssetResolver = (assetPath: string) => string;

/** Определяет контракт `NormalizationDebugInfo` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface NormalizationDebugInfo {
  entityId: string | null;
  targetHeight: number | null;
  currentHeight: number | null;
  scaleFactor: number | null;
  collisionRadius: number | null;
  collisionHeight: number | null;
  attackRange: number | null;
}

/** Определяет контракт `RuntimeNormalizationState` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface RuntimeNormalizationState {
  player: NormalizationDebugInfo | null;
  enemy: NormalizationDebugInfo | null;
}

/** Определяет контракт `ExplorationDebugState` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
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

/** Определяет контракт `CombatDebugState` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
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

/** Определяет контракт `RuntimeDebugState` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface RuntimeDebugState {
  mode: RuntimeMode;
  exploration?: ExplorationDebugState;
  combat?: CombatDebugState;
  normalization?: RuntimeNormalizationState | null;
}

/** Определяет контракт `EncounterInteractionPayload` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface EncounterInteractionPayload {
  playerRoot: PositionNodeLike;
  enemyRoot: PositionNodeLike;
  distanceToEnemy: number;
  interactionDistance: number;
}

/** Определяет контракт `EncounterStartPayload` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface EncounterStartPayload extends EncounterInteractionPayload {
  combatState?: CombatStateLike;
}

/** Определяет контракт `CombatUnitLike` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface CombatUnitLike {
  id: string;
  displayName?: string;
  team?: string;
  hp?: number;
  ap?: number;
  mp?: number;
}

/** Определяет контракт `CombatStateLike` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
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

/** Определяет контракт `SceneRuntimeMountOptions` для согласованного взаимодействия модулей в контексте `render/shared/runtimeContracts`. */
export interface SceneRuntimeMountOptions {
  districtId?: string;
  interactionDistance?: number;
  debugEnabled?: boolean;
  sceneFile?: string;
  playerFile?: string;
  enemyFile?: string;
  playerSpawn?: { x: number; z: number };
  enemySpawn?: { x: number; z: number };
  playerNormalizationId?: string;
  enemyNormalizationId?: string;
  enemyArchetypeId?: string;
  enemyVisionAngleDegrees?: number;
  enemyVisionDistance?: number;
  playerFacingDirection?: { x: number; y: number; z: number };
  enemyFacingDirection?: { x: number; y: number; z: number };
  enemyPatrolPoints?: { x: number; y?: number; z: number }[];
  skipEnemyPatrol?: boolean;
  autoStartCombat?: boolean;
  resolveAssetPath?: AssetResolver;
  onEncounterStart?: (payload: EncounterStartPayload) => void;
  onDebugStateChange?: (state: RuntimeDebugState) => void;
}

/** Описывает тип `SceneRuntimeMount`, который формализует структуру данных в модуле `render/shared/runtimeContracts`. */
export type SceneRuntimeMount = (
  canvas: HTMLCanvasElement,
  options?: SceneRuntimeMountOptions
) => Promise<RuntimeDispose>;
