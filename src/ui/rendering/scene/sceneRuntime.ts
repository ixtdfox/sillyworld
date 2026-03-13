// @ts-nocheck
import { createBabylonWorldRuntime, ensureBabylonRuntime } from './babylonRuntime.ts';
import { createDistrictExplorationRuntime } from './districtExplorationRuntime.ts';
import { ENCOUNTER_INTERACTION_DISTANCE } from '../../../world/encounter/encounterRules.ts';
import { createCombatRuntime } from '../combat/combatRuntime.ts';
import { EncounterCoordinator } from './encounterCoordinator.ts';
import { SceneModeController } from './sceneModeController.ts';
import {
  SceneRuntimeDebugStateEmitter,
  type CombatRuntimeLike,
  type ExplorationRuntimeLike
} from '../debug/sceneRuntimeDebugStateEmitter.ts';
import { createExplorationControlsBinder, type ExplorationControlsBinder } from './explorationControlsBinder.ts';
import { createBabylonLineOfSightAdapter } from './babylonLineOfSightAdapter.ts';
import { createPerceptionObserverBinder } from './perceptionObserverBinder.ts';
import { setupSceneExplorationDebugShell } from '../debug/sceneExplorationDebugShell.ts';
import type {
  CombatStateLike,
  EncounterStartPayload,
  RuntimeDispose,
  SceneRuntimeMount,
  SceneRuntimeMountOptions
} from '../shared/runtimeContracts.ts';

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

export class SceneRuntime {
  readonly #runtime: ReturnType<typeof createBabylonWorldRuntime>;
  readonly #options: SceneRuntimeMountOptions;
  readonly #debugState: SceneRuntimeDebugStateEmitter;
  readonly #mountSession = new SceneMountSession();
  readonly #encounterCoordinator: EncounterCoordinator;
  readonly #modeController = new SceneModeController();

  #explorationRuntime: ExplorationRuntimeLike | null = null;
  #combatRuntime: CombatRuntimeLike | null = null;
  #combatExitInProgress = false;
  #combatExitCooldownUntil = 0;
  #interactionDistance: number;
  #explorationControls: ExplorationControlsBinder | null = null;
  #perceptionBinder: { attach: () => void; detach: () => void } | null = null;
  #lastPerceptionResult: { canSeePlayer?: boolean; reason?: string | null; distanceToPlayer?: number; angleToPlayerDegrees?: number } | null = null;
  #explorationDebugShell: { dispose?: RuntimeDispose } | null = null;
  #hasLineOfSight: (args: any) => boolean;

  constructor(canvas: HTMLCanvasElement, options: SceneRuntimeMountOptions = {}) {
    this.#runtime = createBabylonWorldRuntime(canvas);
    this.#options = options;
    this.#debugState = new SceneRuntimeDebugStateEmitter(this.#runtime, this.#options);
    this.#encounterCoordinator = new EncounterCoordinator(this.#options.onEncounterStart);
    this.#interactionDistance = options.interactionDistance ?? ENCOUNTER_INTERACTION_DISTANCE;
    this.#hasLineOfSight = createBabylonLineOfSightAdapter(this.#runtime, () => ({
      enemyRoot: this.#explorationRuntime?.enemyMeshRoot,
      playerRoot: this.#explorationRuntime?.playerMeshRoot
    }));
  }

  public async mount(): Promise<RuntimeDispose> {
    const debugObserver = this.#options.debugEnabled === true
      ? this.#runtime.scene.onBeforeRenderObservable.add(() => {
          this.#emitDebugState();
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

      if (this.#options.autoStartCombat === true && this.#explorationRuntime?.playerMeshRoot && this.#explorationRuntime?.enemyMeshRoot) {
        const playerPosition = this.#explorationRuntime.playerMeshRoot.position;
        const enemyPosition = this.#explorationRuntime.enemyMeshRoot.position;
        const dx = enemyPosition.x - playerPosition.x;
        const dy = enemyPosition.y - playerPosition.y;
        const dz = enemyPosition.z - playerPosition.z;
        const distanceToEnemy = Math.sqrt(dx * dx + dy * dy + dz * dz);

        await this.enterCombatMode({
          playerRoot: this.#explorationRuntime.playerMeshRoot,
          enemyRoot: this.#explorationRuntime.enemyMeshRoot,
          distanceToEnemy,
          interactionDistance: this.#interactionDistance
        });
        return;
      }

      this.enterExplorationMode();
    } catch (error) {
      this.#mountSession.dispose();
      throw error;
    }

    return () => this.#mountSession.dispose();
  }

  #emitDebugState(): void {
    this.#debugState.emit({
      explorationRuntime: this.#explorationRuntime,
      combatRuntime: this.#combatRuntime,
      combatTransitionStarted: !this.#encounterCoordinator.canStartCombat(),
      interactionDistance: this.#interactionDistance,
      perceptionResult: this.#lastPerceptionResult
    });
  }

  #disposeCombatRuntime(): void {
    this.#combatRuntime?.dispose?.();
    this.#combatRuntime = null;
  }

  #disposeExplorationControls(): void {
    this.#explorationControls?.dispose?.();
    this.#explorationControls = null;
  }

  #disposeExplorationDebugShell(): void {
    this.#explorationDebugShell?.dispose?.();
    this.#explorationDebugShell = null;
  }

  #detachPerceptionObserver(): void {
    this.#perceptionBinder?.detach();
  }

  #attachEnemyPerceptionObserver(): void {
    this.#perceptionBinder?.attach();
  }

  async #setupExplorationRuntime(): Promise<void> {
    const explorationRuntime = await createDistrictExplorationRuntime(this.#runtime, {
      districtId: this.#options.districtId,
      sceneFile: this.#options.sceneFile,
      playerFile: this.#options.playerFile,
      enemyFile: this.#options.enemyFile,
      playerSpawn: this.#options.playerSpawn,
      enemySpawn: this.#options.enemySpawn,
      playerNormalizationId: this.#options.playerNormalizationId,
      enemyNormalizationId: this.#options.enemyNormalizationId,
      enemyArchetypeId: this.#options.enemyArchetypeId,
      enemyVisionAngleDegrees: this.#options.enemyVisionAngleDegrees,
      enemyVisionDistance: this.#options.enemyVisionDistance,
      playerFacingDirection: this.#options.playerFacingDirection,
      enemyFacingDirection: this.#options.enemyFacingDirection,
      enemyPatrolPoints: this.#options.enemyPatrolPoints,
      skipEnemyPatrol: this.#options.skipEnemyPatrol,
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

    this.#explorationControls = createExplorationControlsBinder(this.#runtime, {
      playerEntity: explorationRuntime.playerEntity,
      playerMeshRoot: explorationRuntime.playerMeshRoot
    });
    this.#explorationControls.attach();

    if (this.#options.debugEnabled) {
      this.#disposeExplorationDebugShell();
      this.#explorationDebugShell = setupSceneExplorationDebugShell(this.#runtime, {
        getExplorationRuntime: () => this.#explorationRuntime,
        hasLineOfSight: this.#hasLineOfSight
      });
    }

    this.#perceptionBinder = createPerceptionObserverBinder(this.#runtime, {
      getExplorationRuntime: () => this.#explorationRuntime,
      canRun: () => this.#encounterCoordinator.canStartCombat() && this.#modeController.getMode() === 'exploration',
      isCooldownActive: () => Date.now() < this.#combatExitCooldownUntil,
      hasLineOfSight: this.#hasLineOfSight,
      onPerceptionUpdated: (perceptionResult) => {
        this.#lastPerceptionResult = perceptionResult;
      },
      onCombatTriggered: ({ distanceToEnemy }) => {
        if (!this.#explorationRuntime?.playerMeshRoot || !this.#explorationRuntime?.enemyMeshRoot) {
          return;
        }

        this.enterCombatMode({
          playerRoot: this.#explorationRuntime.playerMeshRoot,
          enemyRoot: this.#explorationRuntime.enemyMeshRoot,
          distanceToEnemy,
          interactionDistance: this.#interactionDistance
        }).catch((error) => {
          console.error('[SillyRPG] Failed to enter world combat mode after enemy perception detection.', error);
        });
      }
    });
    this.#attachEnemyPerceptionObserver();

    const previousDispose = explorationRuntime.dispose;
    explorationRuntime.dispose = () => {
      this.#detachPerceptionObserver();
      this.#disposeExplorationControls();
      this.#disposeExplorationDebugShell();
      previousDispose?.();
    };
  }

  async exitCombatMode(): Promise<void> {
    if (this.#combatExitInProgress) {
      console.debug('[SillyRPG] Combat mode exit ignored because exit is already in progress.');
      return;
    }

    this.#combatExitInProgress = true;
    this.#modeController.enterTransitionMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#emitDebugState();

    try {
      this.#disposeCombatRuntime();
      this.#encounterCoordinator.reset();
      this.#combatExitCooldownUntil = Date.now() + 750;
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
      throw new Error('Cannot enter combat mode without active exploration entity.');
    }

    this.#modeController.enterTransitionMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#emitDebugState();

    this.#disposeExplorationControls();
    this.#detachPerceptionObserver();

    let combatRuntime;
    try {
      combatRuntime = await createCombatRuntime(this.#runtime, {
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
    } catch (error) {
      console.error('[SillyRPG] Combat mode setup failed; restoring exploration mode.', error);
      this.enterExplorationMode();
      throw error;
    }

    this.#combatRuntime = combatRuntime as CombatRuntimeLike;
    this.#modeController.enterCombatMode();
    this.#debugState.setMode(this.#modeController.getMode());
    this.#emitDebugState();

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
    this.#emitDebugState();

    if (this.#modeController.getMode() === 'exploration' && this.#explorationRuntime?.playerMeshRoot) {
      if (!this.#explorationControls?.isAttached()) {
        this.#explorationControls?.attach();
      }
      this.#attachEnemyPerceptionObserver();
    }
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
