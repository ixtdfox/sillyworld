import type { PlayerState, RelationshipState } from '../contracts.ts';
import type { EnemyAmbientBehavior } from '../enemy/enemyAmbientBehavior.ts';
import {
  AIController,
  Character,
  CharacterRelations,
  PlayerController,
  type CharacterKind,
  type CharacterRuntimeState,
  dispositionFromRelationshipState
} from './index.ts';

interface PlayerMovementTargetStateLike {
  hasTarget(): boolean;
  getTarget(): { x: number; z: number } | null;
}

/**
 * Keeps save-schema compatibility by wrapping PlayerState in the new Character aggregate.
 * World persistence still stores PlayerState while runtime systems can start consuming Character.
 */
export function createCharacterFromPlayerState(
  player: PlayerState,
  options: {
    kind?: CharacterKind;
    relationshipToPlayer?: RelationshipState | null;
    cell?: { x: number; z: number } | null;
    controller?: PlayerController;
  } = {}
): Character {
  const relationshipToPlayer = options.relationshipToPlayer
    ? { [player.id]: options.relationshipToPlayer }
    : {};

  return new Character({
    identity: {
      id: player.id,
      name: player.name,
      kind: options.kind ?? 'player'
    },
    controller: options.controller ?? new PlayerController(() => null),
    relations: new CharacterRelations(player.id, relationshipToPlayer),
    runtimeState: {
      cell: options.cell ?? null,
      currentNodeId: player.currentNodeId ?? null,
      homeNodeId: player.homeNodeId ?? null,
      hpCurrent: player.hp.current
    }
  });
}

export function applyCharacterToPlayerState(player: PlayerState, character: Character): PlayerState {
  const runtime = character.getRuntimeState();
  const identity = character.getIdentity();

  return {
    ...player,
    id: identity.id,
    name: identity.name,
    currentNodeId: runtime.currentNodeId ?? player.currentNodeId,
    homeNodeId: runtime.homeNodeId ?? player.homeNodeId,
    hp: {
      ...player.hp,
      current: runtime.hpCurrent
    }
  };
}

/**
 * Backward-compat wrapper: legacy call sites can still ask for runtime DTO data while the new
 * object model exists as the source of truth.
 */
export function toCharacterRuntimeFromPlayerState(
  player: PlayerState,
  options: {
    kind?: CharacterKind;
    relationship?: RelationshipState | null;
    cell?: { x: number; z: number } | null;
  } = {}
): CharacterRuntimeState & {
  identity: { id: string; name: string; kind: CharacterKind };
  dispositionToPlayer: ReturnType<typeof dispositionFromRelationshipState>;
} {
  const character = createCharacterFromPlayerState(player, {
    kind: options.kind,
    relationshipToPlayer: options.relationship,
    cell: options.cell
  });

  const runtime = character.getRuntimeState();

  return {
    ...runtime,
    identity: character.getIdentity(),
    dispositionToPlayer: dispositionFromRelationshipState(options.relationship)
  };
}

export function applyCharacterRuntimeToPlayerState(
  player: PlayerState,
  state: CharacterRuntimeState & { identity: { id: string; name: string; kind: CharacterKind } }
): PlayerState {
  const character = createCharacterFromPlayerState(player, {
    kind: state.identity.kind,
    cell: state.cell,
    controller: new PlayerController(() => null)
  });

  character.setRuntimeState({
    cell: state.cell,
    currentNodeId: state.currentNodeId,
    homeNodeId: state.homeNodeId,
    hpCurrent: state.hpCurrent
  });

  return applyCharacterToPlayerState(
    {
      ...player,
      id: state.identity.id,
      name: state.identity.name
    },
    character
  );
}

export function createPlayerMovementTargetControllerAdapter(
  movementTargetState: PlayerMovementTargetStateLike
): PlayerController {
  return new PlayerController(() => {
    if (!movementTargetState.hasTarget()) {
      return null;
    }

    return movementTargetState.getTarget();
  });
}

export function createEnemyAmbientControllerAdapter(behavior: EnemyAmbientBehavior): AIController {
  return new AIController((character) => {
    const patrolCells = behavior.patrolCells;
    if (!Array.isArray(patrolCells) || patrolCells.length <= 0) {
      return null;
    }

    const destinationCell = patrolCells[behavior.currentPatrolIndex % patrolCells.length] ?? null;
    if (!destinationCell) {
      return null;
    }

    const currentCell = character.getCell();
    if (currentCell && currentCell.x === destinationCell.x && currentCell.z === destinationCell.z) {
      return null;
    }

    return destinationCell;
  });
}
