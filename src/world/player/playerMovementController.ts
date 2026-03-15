// @ts-nocheck
import type { RuntimeDispose } from '../../render/shared/runtimeContracts.ts';
import { Character, CharacterRelations } from '../character/index.ts';
import { createPlayerMovementTargetControllerAdapter } from '../character/characterCompatibilityAdapters.ts';
import { CharacterMovementOrchestrator } from '../movement/characterMovementOrchestrator.ts';

interface BabylonRuntimeSubset {
  engine: { getDeltaTime?: () => number };
  scene: {
    onBeforeRenderObservable: {
      add: (callback: () => void) => unknown;
      remove: (observer: unknown) => void;
    };
  };
}

interface PlayerCharacterLike {
  rootNode: { position: { copyFrom: (position: unknown) => void; x: number; y: number; z: number } };
  gridCell?: { x: number; z: number } | null;
}

interface MovementTargetStateLike {
  hasTarget(): boolean;
  getTarget(): { x: number; z: number } | null;
  clearTarget(): void;
}

interface PlayerMovementControllerOptions {
  moveSpeed?: number;
  stopDistance?: number;
  onMovingStateChange?: (isMoving: boolean) => void;
  gridMapper: {
    worldToGridCell: (worldPosition: { x: number; z: number }) => { x: number; z: number };
    gridCellToWorld: (cell: { x: number; z: number }, transform?: { resolveY?: ({ x, z }: { x: number; z: number }) => number; fallbackY?: number }) => { x: number; y: number; z: number };
  };
  resolveGroundY: ({ x, z, fallbackY }: { x: number; z: number; fallbackY?: number }) => number;
  BABYLON: { Vector3: new (x: number, y: number, z: number) => unknown };
  grid?: {
    findPath?: (startCell: { x: number; z: number }, goalCell: { x: number; z: number }, options?: unknown) => Array<{ x: number; z: number }> | null;
    isCellWalkable?: (cell: { x: number; z: number }) => boolean;
  };
}

/**
 * Legacy exploration adapter retained for scene runtime stability.
 * It now delegates movement execution to CharacterMovementOrchestrator.
 */
export class PlayerMovementController {
  readonly #movementTargetState: MovementTargetStateLike;
  readonly #character: Character;
  readonly #orchestrator: CharacterMovementOrchestrator;

  constructor(
    runtime: BabylonRuntimeSubset,
    playerCharacter: PlayerCharacterLike,
    movementTargetState: MovementTargetStateLike,
    options: PlayerMovementControllerOptions
  ) {
    this.#movementTargetState = movementTargetState;
    this.#character = new Character({
      identity: { id: 'scene:player', name: 'Player', kind: 'player' },
      controller: createPlayerMovementTargetControllerAdapter(movementTargetState),
      relations: new CharacterRelations('scene:player'),
      runtimeState: {
        cell: playerCharacter.gridCell ?? null,
        currentNodeId: null,
        homeNodeId: null,
        hpCurrent: 1
      }
    });

    this.#orchestrator = new CharacterMovementOrchestrator(runtime, {
      character: this.#character,
      rootNode: playerCharacter.rootNode,
      moveSpeed: options.moveSpeed,
      stopDistance: options.stopDistance,
      gridMapper: options.gridMapper,
      grid: options.grid,
      resolveGroundY: options.resolveGroundY,
      BABYLON: options.BABYLON,
      onMovingStateChange: options.onMovingStateChange,
      onMovementRejected: (queueResult) => {
        if (queueResult.reason === 'same_cell' || queueResult.reason === 'path_not_found' || queueResult.reason === 'invalid_cells') {
          this.#movementTargetState.clearTarget();
        }
      },
      onDestinationReached: () => {
        this.#movementTargetState.clearTarget();
      },
      onCellUpdated: (cell) => {
        playerCharacter.gridCell = cell;
      }
    });
  }

  public attach(): RuntimeDispose {
    return this.#orchestrator.attach();
  }

  public dispose(): void {
    this.#orchestrator.dispose();
  }
}
