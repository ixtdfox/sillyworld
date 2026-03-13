// @ts-nocheck
import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.ts';
import { createMovementTargetState } from './movementTargetState.ts';
import { createPlayerAnimationController } from './playerAnimationController.ts';
import { PlayerMovementController } from './playerMovementController.ts';
import { SceneGroundClickInput } from './sceneGroundClickInput.ts';
import { attachGameplayIsometricCamera } from './gameplayCameraController.ts';
import { createDistrictExplorationRuntime } from './districtExplorationRuntime.ts';
import { ENCOUNTER_INTERACTION_DISTANCE } from './encounterInteractionInput.ts';
import { updateEnemyPerception } from './enemyPerception.ts';
import { updateEnemyAmbientBehavior } from './enemyAmbientBehavior.ts';
import { createCombatRuntime } from './combatRuntime.ts';
import { createCombatDebugShell } from './combatDebugShell.ts';
import { createEnemyVisionGridDebugOverlay } from './enemyVisionGridDebugOverlay.ts';
import type {
  CombatStateLike,
  EncounterStartPayload,
  PositionLike,
  PositionNodeLike,
  RuntimeDebugState as RuntimeDebugSnapshot,
  RuntimeDispose,
  RuntimeMode,
  RuntimeNormalizationState,
  SceneRuntimeMount,
  SceneRuntimeMountOptions
} from './runtimeContracts.ts';

interface ExplorationRuntimeLike {
  districtScene?: { sceneContainer?: unknown; cameras?: unknown[] };
  playerEntity?: { normalizationDebug?: RuntimeNormalizationState['player']; gameplayDimensions?: { interactionRadius?: number }; rootNode?: PositionNodeLike };
  enemyEntity?: { normalizationDebug?: RuntimeNormalizationState['enemy']; gameplayDimensions?: { interactionRadius?: number }; rootNode?: PositionNodeLike };
  enemyPerception?: { visionAngleDegrees?: number; visionDistance?: number; facingDirection?: PositionLike };
  enemyAmbientBehavior?: { state?: string; facingDirection?: PositionLike; patrolPoints?: PositionLike[] };
  playerMeshRoot?: PositionNodeLike & { position: PositionLike };
  enemyMeshRoot?: PositionNodeLike & { position: PositionLike };
  dispose?: RuntimeDispose;
}

interface CombatRuntimeLike {
  combatState?: CombatStateLike;
  dispose?: RuntimeDispose;
}

class RuntimeDebugState {
  readonly #options: SceneRuntimeMountOptions;
  readonly #runtime: ReturnType<typeof createBabylonWorldRuntime>;
  #mode: RuntimeMode = 'loading';

  constructor(runtime: ReturnType<typeof createBabylonWorldRuntime>, options: SceneRuntimeMountOptions) {
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
      const playerPosition = SceneRuntime.toPositionSnapshot(explorationRuntime.playerMeshRoot);
      const enemyPosition = SceneRuntime.toPositionSnapshot(explorationRuntime.enemyMeshRoot);
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

class SceneMountSession {
  #cleanup: RuntimeDispose[] = [];

  public register(cleanup: RuntimeDispose): void {
    this.#cleanup.push(cleanup);
  }

  public dispose(): void {
    for (let index = this.#cleanup.length - 1; index >= 0; index -= 1) {
      this.#cleanup[index]?.();
    }
    this.#cleanup = [];
  }
}

class EncounterCoordinator {
  readonly #onEncounterStart?: (payload: EncounterStartPayload) => void;
  #started = false;

  constructor(onEncounterStart?: (payload: EncounterStartPayload) => void) {
    this.#onEncounterStart = onEncounterStart;
  }

  public canStartCombat(): boolean {
    return !this.#started;
  }

  public notifyCombatStarted(payload: EncounterStartPayload): void {
    this.#started = true;
    this.#onEncounterStart?.(payload);
  }

  public reset(): void {
    this.#started = false;
  }
}

class WorldModeController {
  #mode: RuntimeMode = 'loading';

  public getMode(): RuntimeMode {
    return this.#mode;
  }

  public enterExplorationMode() {
    this.#mode = 'exploration';
  }

  public enterCombatMode() {
    this.#mode = 'combat';
  }

  public enterTransitionMode() {
    this.#mode = 'transitioning';
  }
}

export class SceneRuntime {
  readonly #runtime: ReturnType<typeof createBabylonWorldRuntime>;
  readonly #options: SceneRuntimeMountOptions;
  readonly #debugState: RuntimeDebugState;
  readonly #mountSession = new SceneMountSession();
  readonly #encounterCoordinator: EncounterCoordinator;
  readonly #modeController = new WorldModeController();

  #explorationRuntime: ExplorationRuntimeLike | null = null;
  #combatRuntime: CombatRuntimeLike | null = null;
  #combatExitInProgress = false;
  #interactionDistance: number;
  #detachExplorationInputs: RuntimeDispose = () => {};
  #attachExplorationControls: (() => void) | null = null;
  #explorationControlsAttached = false;
  #perceptionObserver: unknown | null = null;
  #lastPerceptionResult: { canSeePlayer?: boolean; reason?: string | null; distanceToPlayer?: number; angleToPlayerDegrees?: number } | null = null;
  #explorationDebugShell: { dispose?: RuntimeDispose } | null = null;

  constructor(canvas: HTMLCanvasElement, options: SceneRuntimeMountOptions = {}) {
    this.#runtime = createBabylonWorldRuntime(canvas);
    this.#options = options;
    this.#debugState = new RuntimeDebugState(this.#runtime, this.#options);
    this.#encounterCoordinator = new EncounterCoordinator(this.#options.onEncounterStart);
    this.#interactionDistance = options.interactionDistance ?? ENCOUNTER_INTERACTION_DISTANCE;
  }

  public async mount(): Promise<RuntimeDispose> {
    const debugObserver = this.#options.debugEnabled === true
      ? this.#runtime.scene.onBeforeRenderObservable.add(() => {
          this.#debugState.emit({
            explorationRuntime: this.#explorationRuntime,
            combatRuntime: this.#combatRuntime,
            combatTransitionStarted: !this.#encounterCoordinator.canStartCombat(),
            interactionDistance: this.#interactionDistance,
            perceptionResult: this.#lastPerceptionResult
          });
        })
      : null;

    if (debugObserver) {
      this.#mountSession.register(() => this.#runtime.scene.onBeforeRenderObservable.remove(debugObserver));
    }

    this.#mountSession.register(() => {
      this.#disposeCombatRuntime();
      this.#detachPerceptionObserver();
      this.#disposeExplorationControls();
      this.#explorationRuntime?.dispose?.();
      this.#runtime.dispose();
    });

    try {
      await this.#setupExplorationRuntime();
      this.enterExplorationMode();
    } catch (error) {
      this.#mountSession.dispose();
      throw error;
    }

    return () => this.#mountSession.dispose();
  }

  static toPositionSnapshot(node?: PositionNodeLike | null): PositionLike | null {
    if (!node?.position) {
      return null;
    }

    return {
      x: node.position.x,
      y: node.position.y,
      z: node.position.z
    };
  }

  #disposeCombatRuntime(): void {
    this.#combatRuntime?.dispose?.();
    this.#combatRuntime = null;
  }

  #disposeExplorationControls(): void {
    this.#detachExplorationInputs?.();
    this.#detachExplorationInputs = () => {};
  }

  #disposeExplorationDebugShell(): void {
    this.#explorationDebugShell?.dispose?.();
    this.#explorationDebugShell = null;
  }

  async #setupExplorationRuntime(): Promise<void> {
    const explorationRuntime = await createDistrictExplorationRuntime(this.#runtime, {
      districtId: this.#options.districtId,
      sceneFile: this.#options.sceneFile,
      playerFile: this.#options.playerFile,
      enemyFile: this.#options.enemyFile,
      enemySpawn: this.#options.enemySpawn,
      playerNormalizationId: this.#options.playerNormalizationId,
      enemyNormalizationId: this.#options.enemyNormalizationId,
      enemyArchetypeId: this.#options.enemyArchetypeId,
      enemyVisionAngleDegrees: this.#options.enemyVisionAngleDegrees,
      enemyVisionDistance: this.#options.enemyVisionDistance,
      enemyFacingDirection: this.#options.enemyFacingDirection,
      enemyPatrolPoints: this.#options.enemyPatrolPoints,
      resolveAssetPath: this.#options.resolveAssetPath
    });
    this.#explorationRuntime = explorationRuntime;

    if (!Number.isFinite(this.#options.interactionDistance)) {
      const playerInteractionRadius = explorationRuntime.playerEntity?.gameplayDimensions?.interactionRadius;
      const enemyInteractionRadius = explorationRuntime.enemyEntity?.gameplayDimensions?.interactionRadius;
      this.#interactionDistance = Number.isFinite(playerInteractionRadius)
        ? playerInteractionRadius
        : Number.isFinite(enemyInteractionRadius)
          ? enemyInteractionRadius
          : ENCOUNTER_INTERACTION_DISTANCE;
    }

    if (!explorationRuntime.playerEntity?.rootNode || !explorationRuntime.playerMeshRoot || !explorationRuntime.enemyMeshRoot) {
      throw new Error('Exploration runtime must expose player and enemy mesh roots.');
    }

    const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
    const movementTargetState = createMovementTargetState();
    const movementController = new PlayerMovementController(
      this.#runtime,
      explorationRuntime.playerEntity as { rootNode: PositionNodeLike & { position: PositionLike } },
      movementTargetState,
      {
        onMovingStateChange: (isMoving: boolean) => playerAnimationController.setMoving(isMoving)
      }
    );
    const groundClickInput = new SceneGroundClickInput(this.#runtime, movementTargetState);

    this.#attachExplorationControls = () => {
      if (this.#explorationControlsAttached) {
        return;
      }

      this.#explorationControlsAttached = true;
      const innerDetachGroundInput = groundClickInput.attach();
      const innerDetachMovement = movementController.attach();
      const innerDetachCamera = attachGameplayIsometricCamera(this.#runtime, explorationRuntime.playerMeshRoot);

      this.#detachExplorationInputs = () => {
        if (!this.#explorationControlsAttached) {
          return;
        }

        this.#explorationControlsAttached = false;
        innerDetachGroundInput();
        innerDetachMovement();
        innerDetachCamera();
        this.#detachExplorationInputs = () => {};
      };
    };

    this.#attachExplorationControls();
    if (this.#options.debugEnabled) {
      this.#disposeExplorationDebugShell();
      const debugShell = createCombatDebugShell(this.#runtime);
      debugShell.registerPanel({
        id: 'enemy-vision-grid',
        label: 'Enemy Vision Grid',
        initialVisible: true,
        createPanel: () => createEnemyVisionGridDebugOverlay(this.#runtime, {
          getEnemyActor: () => {
            if (!this.#explorationRuntime?.enemyMeshRoot) {
              return null;
            }

            return {
              id: 'scene_enemy',
              rootNode: this.#explorationRuntime.enemyMeshRoot,
              perception: {
                visionAngleDegrees: this.#explorationRuntime.enemyPerception?.visionAngleDegrees,
                visionDistance: this.#explorationRuntime.enemyPerception?.visionDistance
              },
              facingDirection: this.#explorationRuntime.enemyPerception?.facingDirection
            };
          },
          getPlayerActor: () => this.#explorationRuntime?.playerMeshRoot
            ? { id: 'scene_player', rootNode: this.#explorationRuntime.playerMeshRoot }
            : null,
          resolveY: (position: PositionLike) => position?.y ?? 0,
          hasLineOfSight: ({ enemy, directionToPlayer, distanceToPlayer }) => this.#hasLineOfSight({
            enemy,
            directionToPlayer,
            distanceToPlayer
          })
        })
      });
      this.#explorationDebugShell = debugShell;
    }
    this.#attachEnemyPerceptionObserver();

    const previousDispose = explorationRuntime.dispose;
    explorationRuntime.dispose = () => {
      this.#detachPerceptionObserver();
      this.#disposeExplorationControls();
      this.#disposeExplorationDebugShell();
      previousDispose?.();
    };
  }

  #hasLineOfSight({ enemy, directionToPlayer, distanceToPlayer }): boolean {
    const origin = enemy?.rootNode?.position;
    if (!origin || !Number.isFinite(distanceToPlayer) || distanceToPlayer <= 0) {
      return false;
    }

    const ray = new this.#runtime.BABYLON.Ray(origin, directionToPlayer, distanceToPlayer);
    const hit = this.#runtime.scene.pickWithRay(ray, (mesh) => {
      if (!mesh?.isEnabled?.() || mesh?.isVisible === false) {
        return false;
      }
      if (mesh === this.#explorationRuntime?.enemyMeshRoot || mesh === this.#explorationRuntime?.playerMeshRoot) {
        return false;
      }
      return true;
    });

    return !(hit?.hit === true);
  }


  #detachPerceptionObserver(): void {
    if (this.#perceptionObserver) {
      this.#runtime.scene.onBeforeRenderObservable.remove(this.#perceptionObserver);
      this.#perceptionObserver = null;
    }
  }

  #attachEnemyPerceptionObserver(): void {
    this.#detachPerceptionObserver();

    this.#perceptionObserver = this.#runtime.scene.onBeforeRenderObservable.add(() => {
      if (!this.#explorationRuntime?.enemyMeshRoot || !this.#explorationRuntime?.playerMeshRoot) {
        return;
      }
      if (!this.#encounterCoordinator.canStartCombat()) {
        return;
      }
      if (this.#modeController.getMode() !== 'exploration') {
        return;
      }

      const deltaMs = this.#runtime.engine?.getDeltaTime?.() ?? 16;
      const deltaSeconds = Math.max(0, deltaMs / 1000);

      const updatedBehavior = this.#explorationRuntime.enemyAmbientBehavior
        ? updateEnemyAmbientBehavior({
            enemyRootNode: this.#explorationRuntime.enemyMeshRoot,
            behavior: this.#explorationRuntime.enemyAmbientBehavior,
            deltaSeconds,
            logger: console
          })
        : null;

      if (updatedBehavior?.facingDirection) {
        this.#explorationRuntime.enemyPerception = this.#explorationRuntime.enemyPerception ?? {};
        this.#explorationRuntime.enemyPerception.facingDirection = { ...updatedBehavior.facingDirection };
      }

      const enemyActor = {
        id: 'scene_enemy',
        rootNode: this.#explorationRuntime.enemyMeshRoot,
        perception: {
          visionAngleDegrees: this.#explorationRuntime.enemyPerception?.visionAngleDegrees,
          visionDistance: this.#explorationRuntime.enemyPerception?.visionDistance
        },
        facingDirection: this.#explorationRuntime.enemyPerception?.facingDirection
      };
      const playerActor = {
        id: 'scene_player',
        rootNode: this.#explorationRuntime.playerMeshRoot
      };

      const perceptionResult = updateEnemyPerception(enemyActor, playerActor, {
        hasLineOfSight: ({ enemy, directionToPlayer, distanceToPlayer }) => this.#hasLineOfSight({
          enemy,
          directionToPlayer,
          distanceToPlayer
        })
      });

      this.#lastPerceptionResult = perceptionResult;
      if (perceptionResult.canSeePlayer) {
        this.enterCombatMode({
          playerRoot: this.#explorationRuntime.playerMeshRoot,
          enemyRoot: this.#explorationRuntime.enemyMeshRoot,
          distanceToEnemy: perceptionResult.distanceToPlayer,
          interactionDistance: this.#interactionDistance
        }).catch((error) => {
          console.error('[SillyRPG] Failed to enter world combat mode after enemy perception detection.', error);
        });
      }
    });
  }


  async exitCombatMode(): Promise<void> {
    if (this.#combatExitInProgress) {
      console.debug('[SillyRPG] Combat mode exit ignored because exit is already in progress.');
      return;
    }

    this.#combatExitInProgress = true;
    this.#modeController.enterTransitionMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#debugState.emit({
      explorationRuntime: this.#explorationRuntime,
      combatRuntime: this.#combatRuntime,
      combatTransitionStarted: !this.#encounterCoordinator.canStartCombat(),
      interactionDistance: this.#interactionDistance,
      perceptionResult: this.#lastPerceptionResult
    });

    try {
      this.#disposeCombatRuntime();
      this.#encounterCoordinator.reset();
      this.enterExplorationMode();
      console.info('[SillyRPG] Combat mode exited');
    } finally {
      this.#combatExitInProgress = false;
    }
  }

  async enterCombatMode(encounterDetails: EncounterStartPayload): Promise<CombatStateLike | null> {
    if (!this.#encounterCoordinator.canStartCombat()) {
      return null;
    }

    if (!this.#explorationRuntime?.playerEntity || !this.#explorationRuntime?.enemyEntity) {
      throw new Error('Cannot enter combat mode without active exploration entities.');
    }

    this.#modeController.enterTransitionMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#debugState.emit({
      explorationRuntime: this.#explorationRuntime,
      combatRuntime: this.#combatRuntime,
      combatTransitionStarted: true,
      interactionDistance: this.#interactionDistance,
      perceptionResult: this.#lastPerceptionResult
    });

    this.#disposeExplorationControls();
    this.#detachPerceptionObserver();

    const combatRuntime = await createCombatRuntime(this.#runtime, {
      worldCombatMode: true,
      sceneContainer: this.#explorationRuntime.districtScene?.sceneContainer,
      cameras: this.#explorationRuntime.districtScene?.cameras,
      playerEntity: this.#explorationRuntime.playerEntity,
      enemyEntity: this.#explorationRuntime.enemyEntity,
      enemyArchetypeId: this.#options.enemyArchetypeId,
      attachCamera: false,
      onCombatEnd: ({ result, combatState: resolvedCombatState }) => {
        console.info('[SillyRPG] Combat end callback received', {
          result: result ?? null,
          source: resolvedCombatState?.endReason ?? 'unknown'
        });
        this.exitCombatMode().catch((error) => {
          console.error('[SillyRPG] Failed to exit combat mode.', error);
        });
      }
    });

    this.#combatRuntime = combatRuntime as CombatRuntimeLike;
    this.#modeController.enterCombatMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#debugState.emit({
      explorationRuntime: this.#explorationRuntime,
      combatRuntime: this.#combatRuntime,
      combatTransitionStarted: true,
      interactionDistance: this.#interactionDistance,
      perceptionResult: this.#lastPerceptionResult
    });

    const combatState = (combatRuntime as CombatRuntimeLike).combatState;
    console.info('[SillyRPG] Combat mode entered');
    console.info('[SillyRPG] Combat participants registered', {
      playerId: combatState?.units?.player?.id ?? null,
      enemyId: combatState?.units?.enemy?.id ?? null
    });
    this.#encounterCoordinator.notifyCombatStarted({
      ...encounterDetails,
      combatState
    });

    return combatState ?? null;
  }

  enterExplorationMode(): void {
    this.#modeController.enterExplorationMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#debugState.emit({
      explorationRuntime: this.#explorationRuntime,
      combatRuntime: this.#combatRuntime,
      combatTransitionStarted: !this.#encounterCoordinator.canStartCombat(),
      interactionDistance: this.#interactionDistance,
      perceptionResult: this.#lastPerceptionResult
    });

    if (this.#modeController.getMode() === 'exploration' && this.#explorationRuntime?.playerMeshRoot) {
      this.#setupExplorationControlsIfMissing();
      this.#attachEnemyPerceptionObserver();
    }
  }

  #setupExplorationControlsIfMissing() {
    if (this.#explorationControlsAttached) {
      return;
    }

    this.#attachExplorationControls?.();
  }
}

export const mountSceneRuntime: SceneRuntimeMount = async (
  canvas: HTMLCanvasElement,
  options: SceneRuntimeMountOptions = {}
) => {
  await ensureBabylonRuntime();
  const runtime = new SceneRuntime(canvas, options);
  return runtime.mount();
};
