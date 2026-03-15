// @ts-nocheck
import { createMovementTargetState } from '../world/movement/movementTargetState.ts';
import { CharacterMovementOrchestrator } from '../world/movement/characterMovementOrchestrator.ts';
import { Character, CharacterRelations, PlayerController } from '../world/character/index.ts';
import { createWorldGridMapper } from '../world/spatial/worldGrid.ts';
import { createCombatGrid } from '../world/spatial/grid/Grid.ts';
import { createPlayerAnimationController } from '../world/player/playerAnimationController.ts';
import { SceneGroundMovementInput } from './sceneGroundMovementInput.ts';
import type { PositionLike, PositionNodeLike, RuntimeDispose } from '../render/shared/runtimeContracts.ts';

export interface ExplorationControlsBinder {
  attach: () => void;
  dispose: RuntimeDispose;
  isAttached: () => boolean;
}

function resolveGroundY(runtime, x: number, z: number, fallbackY = 0): number {
  const groundMesh = runtime?.scene?.getMeshByName?.('Ground') ?? null;
  if (!groundMesh || groundMesh.isEnabled?.() === false || groundMesh.isVisible === false) {
    return fallbackY;
  }

  const origin = new runtime.BABYLON.Vector3(x, fallbackY + 25, z);
  const ray = new runtime.BABYLON.Ray(origin, new runtime.BABYLON.Vector3(0, -1, 0), 200);
  const hit = runtime.scene.pickWithRay(ray, (mesh) => mesh === groundMesh);
  return hit?.hit && hit.pickedPoint ? hit.pickedPoint.y : fallbackY;
}

export function createExplorationControlsBinder(
  runtime,
  explorationRuntime: {
    playerEntity: { rootNode: PositionNodeLike & { position: PositionLike }; gridCell?: { x: number; z: number } | null };
    playerMeshRoot: PositionNodeLike & { position: PositionLike };
  }
): ExplorationControlsBinder {
  let attached = false;
  let detach: RuntimeDispose = () => {};

  const playerAnimationController = createPlayerAnimationController(explorationRuntime.playerEntity);
  const movementTargetState = createMovementTargetState();
  const gridMapper = createWorldGridMapper();
  const worldGrid = createCombatGrid({
    minX: gridMapper.minX,
    maxX: gridMapper.maxX,
    minZ: gridMapper.minZ,
    maxZ: gridMapper.maxZ,
    blockedCells: gridMapper.blockedCells
  });

  const character = new Character({
    identity: { id: 'scene:player', name: 'Player', kind: 'player' },
    controller: new PlayerController(() => (movementTargetState.hasTarget() ? movementTargetState.getTarget() : null)),
    relations: new CharacterRelations('scene:player'),
    runtimeState: {
      cell: explorationRuntime.playerEntity.gridCell ?? null,
      currentNodeId: null,
      homeNodeId: null,
      hpCurrent: 1
    }
  });

  const movementController = new CharacterMovementOrchestrator(runtime, {
    character,
    rootNode: explorationRuntime.playerEntity.rootNode,
    moveSpeed: 4,
    gridMapper,
    grid: worldGrid,
    resolveGroundY: ({ x, z, fallbackY }) => resolveGroundY(runtime, x, z, fallbackY),
    BABYLON: runtime.BABYLON,
    onMovingStateChange: (isMoving: boolean) => playerAnimationController.setMoving(isMoving),
    onMovementRejected: (queueResult) => {
      if (queueResult.reason === 'same_cell' || queueResult.reason === 'path_not_found' || queueResult.reason === 'invalid_cells') {
        movementTargetState.clearTarget();
      }
    },
    onDestinationReached: () => {
      movementTargetState.clearTarget();
    },
    onCellUpdated: (cell) => {
      explorationRuntime.playerEntity.gridCell = cell;
    }
  });

  const groundClickInput = new SceneGroundMovementInput(runtime, movementTargetState, gridMapper, worldGrid);

  return {
    attach: () => {
      if (attached) {
        return;
      }

      attached = true;
      const detachGroundInput = groundClickInput.attach();
      const detachMovement = movementController.attach();

      detach = () => {
        if (!attached) {
          return;
        }
        attached = false;
        detachGroundInput();
        detachMovement();
        detach = () => {};
      };
    },
    dispose: () => detach(),
    isAttached: () => attached
  };
}
