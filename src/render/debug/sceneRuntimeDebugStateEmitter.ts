// @ts-nocheck
import type {
  CombatStateLike,
  PositionLike,
  PositionNodeLike,
  RuntimeDebugState as RuntimeDebugSnapshot,
  RuntimeDispose,
  RuntimeMode,
  RuntimeNormalizationState,
  SceneRuntimeMountOptions
} from '../shared/runtimeContracts.ts';

/** Определяет контракт `ExplorationRuntimeLike` для согласованного взаимодействия модулей в контексте `render/debug/sceneRuntimeDebugStateEmitter`. */
export interface ExplorationRuntimeLike {
  districtScene?: { sceneContainer?: unknown; cameras?: unknown[] };
  playerEntity?: { normalizationDebug?: RuntimeNormalizationState['player']; gameplayDimensions?: { interactionRadius?: number }; rootNode?: PositionNodeLike };
  enemyEntity?: { normalizationDebug?: RuntimeNormalizationState['enemy']; gameplayDimensions?: { interactionRadius?: number }; rootNode?: PositionNodeLike };
  enemyPerception?: { visionAngleDegrees?: number; visionDistance?: number; facingDirection?: PositionLike };
  enemyAmbientBehavior?: { state?: string; facingDirection?: PositionLike; patrolPoints?: PositionLike[]; currentPatrolIndex?: number };
  playerMeshRoot?: PositionNodeLike & { position: PositionLike };
  enemyMeshRoot?: PositionNodeLike & { position: PositionLike };
  dispose?: RuntimeDispose;
}

/** Определяет контракт `CombatRuntimeLike` для согласованного взаимодействия модулей в контексте `render/debug/sceneRuntimeDebugStateEmitter`. */
export interface CombatRuntimeLike {
  combatState?: CombatStateLike;
  dispose?: RuntimeDispose;
}

/** Выполняет `toPositionSnapshot` в ходе выполнения связанного игрового сценария. */
export function toPositionSnapshot(node?: PositionNodeLike | null): PositionLike | null {
  if (!node?.position) {
    return null;
  }

  return {
    x: node.position.x,
    y: node.position.y,
    z: node.position.z
  };
}

/** Класс `SceneRuntimeDebugStateEmitter` координирует соответствующий сценарий модуля `render/debug/sceneRuntimeDebugStateEmitter` и инкапсулирует связанную логику. */
export class SceneRuntimeDebugStateEmitter {
  readonly #options: SceneRuntimeMountOptions;
  readonly #runtime: { BABYLON: { Vector3: { Distance: (a: PositionLike, b: PositionLike) => number } } };
  #mode: RuntimeMode = 'loading';

  constructor(runtime: { BABYLON: { Vector3: { Distance: (a: PositionLike, b: PositionLike) => number } } }, options: SceneRuntimeMountOptions) {
    this.#runtime = runtime;
    this.#options = options;
  }

  public setMode(mode: RuntimeMode): void {
    this.#mode = mode;
  }

  public emit(state: { explorationRuntime: ExplorationRuntimeLike | null; combatRuntime: CombatRuntimeLike | null; combatTransitionStarted: boolean; interactionDistance: number; perceptionResult?: { canSeePlayer?: boolean; reason?: string | null; distanceToPlayer?: number; angleToPlayerDegrees?: number } | null }): void {
    if (this.#options.debugEnabled !== true || !this.#options.onDebugStateChange) {
      return;
    }

    const { explorationRuntime, combatRuntime, combatTransitionStarted, interactionDistance, perceptionResult } = state;

    const normalizationSnapshot: RuntimeNormalizationState | null = explorationRuntime
      ? {
          player: explorationRuntime.playerEntity?.normalizationDebug ?? null,
          enemy: explorationRuntime.enemyEntity?.normalizationDebug ?? null
        }
      : null;

    if (this.#mode === 'combat' && combatRuntime?.combatState) {
      const combatState = combatRuntime.combatState;
      const activeUnit = combatState.getActiveUnit?.() ?? null;
      this.#options.onDebugStateChange({
        mode: this.#mode,
        combat: {
          state: combatState.status ?? null,
          phase: combatState.phase ?? null,
          round: combatState.turn?.roundNumber ?? null,
          activeUnit: activeUnit ? `${activeUnit.id}:${activeUnit.displayName ?? activeUnit.id}` : null,
          turnOwner: activeUnit?.team ?? null,
          actionMode: combatState.inputMode ?? null,
          activeUnitAp: activeUnit?.ap ?? null,
          activeUnitMp: activeUnit?.mp ?? null,
          playerHp: combatState.units?.player?.hp ?? null,
          playerAp: combatState.units?.player?.ap ?? null,
          playerMp: combatState.units?.player?.mp ?? null,
          enemyHp: combatState.units?.enemy?.hp ?? null,
          enemyAp: combatState.units?.enemy?.ap ?? null,
          enemyMp: combatState.units?.enemy?.mp ?? null
        }
      });
      return;
    }

    if (explorationRuntime?.playerMeshRoot && explorationRuntime?.enemyMeshRoot) {
      const playerPosition = toPositionSnapshot(explorationRuntime.playerMeshRoot);
      const enemyPosition = toPositionSnapshot(explorationRuntime.enemyMeshRoot);
      const distanceToEnemy = this.#runtime.BABYLON.Vector3.Distance(
        explorationRuntime.playerMeshRoot.position,
        explorationRuntime.enemyMeshRoot.position
      );

      const currentPatrolIndex = Number.isFinite(explorationRuntime.enemyAmbientBehavior?.currentPatrolIndex)
        ? explorationRuntime.enemyAmbientBehavior.currentPatrolIndex
        : null;
      const patrolPoints = explorationRuntime.enemyAmbientBehavior?.patrolPoints ?? [];
      const patrolTarget = currentPatrolIndex !== null && patrolPoints.length > 0
        ? patrolPoints[currentPatrolIndex % patrolPoints.length]
        : null;

      this.#options.onDebugStateChange({
        mode: this.#mode,
        exploration: {
          playerPosition,
          enemyPosition,
          distanceToEnemy,
          enemyInteractionAllowed: !combatTransitionStarted && distanceToEnemy <= interactionDistance,
          enemyPerceptionDetected: perceptionResult?.canSeePlayer ?? false,
          enemyPerceptionReason: perceptionResult?.reason ?? null,
          enemyPerceptionDistance: Number.isFinite(perceptionResult?.distanceToPlayer) ? perceptionResult.distanceToPlayer : null,
          enemyPerceptionAngle: Number.isFinite(perceptionResult?.angleToPlayerDegrees) ? perceptionResult.angleToPlayerDegrees : null,
          enemyAiState: explorationRuntime.enemyAmbientBehavior?.state ?? null,
          enemyPatrolPointIndex: currentPatrolIndex,
          enemyPatrolTarget: patrolTarget,
          normalization: normalizationSnapshot
        }
      });
      return;
    }

    this.#options.onDebugStateChange({ mode: this.#mode, normalization: normalizationSnapshot } as RuntimeDebugSnapshot);
  }
}
