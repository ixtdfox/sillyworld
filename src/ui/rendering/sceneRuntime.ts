// @ts-nocheck
import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.ts';
import { createMovementTargetState } from './movementTargetState.ts';
import { createPlayerAnimationController } from './playerAnimationController.ts';
import { PlayerMovementController } from './playerMovementController.ts';
import { SceneGroundClickInput } from './sceneGroundClickInput.ts';
import { attachGameplayIsometricCamera } from './gameplayCameraController.ts';
import { createDistrictExplorationRuntime } from './districtExplorationRuntime.ts';
import { ENCOUNTER_INTERACTION_DISTANCE, EncounterInteractionInput } from './encounterInteractionInput.ts';
import { createCombatRuntime } from './combatRuntime.ts';
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
  playerEntity?: { normalizationDebug?: RuntimeNormalizationState['player']; gameplayDimensions?: { interactionRadius?: number } };
  enemyEntity?: { normalizationDebug?: RuntimeNormalizationState['enemy']; gameplayDimensions?: { interactionRadius?: number } };
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

  public emit(activeGameplayRuntime: ExplorationRuntimeLike | CombatRuntimeLike | null, combatTransitionStarted: boolean, interactionDistance: number): void {
    if (this.#options.debugEnabled !== true || !this.#options.onDebugStateChange) {
      return;
    }

    const explorationRuntime = this.#mode === 'exploration' ? (activeGameplayRuntime as ExplorationRuntimeLike | null) : null;
    const combatRuntime = this.#mode === 'combat' ? (activeGameplayRuntime as CombatRuntimeLike | null) : null;

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

    if (this.#mode === 'exploration' && explorationRuntime?.playerMeshRoot && explorationRuntime?.enemyMeshRoot) {
      const playerPosition = SceneRuntime.toPositionSnapshot(explorationRuntime.playerMeshRoot);
      const enemyPosition = SceneRuntime.toPositionSnapshot(explorationRuntime.enemyMeshRoot);
      const distanceToEnemy = this.#runtime.BABYLON.Vector3.Distance(
        explorationRuntime.playerMeshRoot.position,
        explorationRuntime.enemyMeshRoot.position
      );

      this.#options.onDebugStateChange({
        mode: this.#mode,
        exploration: {
          playerPosition,
          enemyPosition,
          distanceToEnemy,
          enemyInteractionAllowed: !combatTransitionStarted && distanceToEnemy <= interactionDistance,
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

export class SceneRuntime {
  readonly #runtime: ReturnType<typeof createBabylonWorldRuntime>;
  readonly #options: SceneRuntimeMountOptions;
  readonly #debugState: RuntimeDebugState;
  readonly #mountSession = new SceneMountSession();
  readonly #encounterCoordinator: EncounterCoordinator;

  #activeGameplayRuntime: ExplorationRuntimeLike | CombatRuntimeLike | null = null;
  #combatExitInProgress = false;
  #interactionDistance: number;

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
          this.#debugState.emit(this.#activeGameplayRuntime, !this.#encounterCoordinator.canStartCombat(), this.#interactionDistance);
        })
      : null;

    if (debugObserver) {
      this.#mountSession.register(() => this.#runtime.scene.onBeforeRenderObservable.remove(debugObserver));
    }

    this.#mountSession.register(() => {
      this.#disposeActiveGameplayRuntime();
      this.#runtime.dispose();
    });

    try {
      await this.#setupExplorationRuntime();
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

  #disposeActiveGameplayRuntime(): void {
    this.#activeGameplayRuntime?.dispose?.();
    this.#activeGameplayRuntime = null;
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
      resolveAssetPath: this.#options.resolveAssetPath
    });
    this.#activeGameplayRuntime = explorationRuntime;

    if (!Number.isFinite(this.#options.interactionDistance)) {
      const playerInteractionRadius = explorationRuntime.playerEntity?.gameplayDimensions?.interactionRadius;
      const enemyInteractionRadius = explorationRuntime.enemyEntity?.gameplayDimensions?.interactionRadius;
      this.#interactionDistance = Number.isFinite(playerInteractionRadius)
        ? playerInteractionRadius
        : Number.isFinite(enemyInteractionRadius)
          ? enemyInteractionRadius
          : ENCOUNTER_INTERACTION_DISTANCE;
    }

    this.#debugState.setMode('exploration');
    this.#debugState.emit(this.#activeGameplayRuntime, !this.#encounterCoordinator.canStartCombat(), this.#interactionDistance);

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
    const encounterInput = new EncounterInteractionInput(this.#runtime, {
      playerRoot: explorationRuntime.playerMeshRoot,
      enemyRoot: explorationRuntime.enemyMeshRoot,
      interactionDistance: this.#interactionDistance,
      onEncounterStart: (details) => {
        this.#transitionToCombat(details).catch((error) => {
          console.error('[SillyRPG] Failed to transition from exploration to combat.', error);
        });
      }
    });

    const detachCamera = attachGameplayIsometricCamera(this.#runtime, explorationRuntime.playerMeshRoot);
    const detachGroundInput = groundClickInput.attach();
    const detachEncounterInput = encounterInput.attach();
    const detachMovement = movementController.attach();

    const previousDispose = explorationRuntime.dispose;
    explorationRuntime.dispose = () => {
      detachGroundInput();
      detachEncounterInput();
      detachMovement();
      detachCamera();
      previousDispose?.();
    };
  }

  async #transitionOutOfCombat(): Promise<void> {
    if (this.#combatExitInProgress) {
      return;
    }

    this.#combatExitInProgress = true;
    this.#debugState.setMode('transitioning');
    this.#debugState.emit(this.#activeGameplayRuntime, !this.#encounterCoordinator.canStartCombat(), this.#interactionDistance);
    this.#disposeActiveGameplayRuntime();
    this.#encounterCoordinator.reset();

    try {
      await this.#setupExplorationRuntime();
    } finally {
      this.#combatExitInProgress = false;
    }
  }

  async #transitionToCombat(encounterDetails: EncounterStartPayload): Promise<CombatStateLike | null> {
    if (!this.#encounterCoordinator.canStartCombat()) {
      return null;
    }

    this.#debugState.setMode('transitioning');
    this.#debugState.emit(this.#activeGameplayRuntime, true, this.#interactionDistance);
    this.#disposeActiveGameplayRuntime();

    const combatRuntime = await createCombatRuntime(this.#runtime, {
      sceneFile: this.#options.combatSceneFile,
      playerFile: this.#options.playerFile,
      enemyFile: this.#options.enemyFile,
      playerNormalizationId: this.#options.playerNormalizationId,
      enemyNormalizationId: this.#options.enemyNormalizationId,
      enemyArchetypeId: this.#options.enemyArchetypeId,
      resolveAssetPath: this.#options.resolveAssetPath,
      onCombatEnd: () => {
        this.#transitionOutOfCombat().catch((error) => {
          console.error('[SillyRPG] Failed to transition from combat to exploration.', error);
        });
      }
    });

    this.#activeGameplayRuntime = combatRuntime as CombatRuntimeLike;
    this.#debugState.setMode('combat');
    this.#debugState.emit(this.#activeGameplayRuntime, true, this.#interactionDistance);

    const combatState = (combatRuntime as CombatRuntimeLike).combatState;
    this.#encounterCoordinator.notifyCombatStarted({
      ...encounterDetails,
      combatState
    });

    return combatState ?? null;
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
