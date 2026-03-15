import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCharacterRuntimeToPlayerState,
  applyCharacterToPlayerState,
  createCharacterFromPlayerState,
  createEnemyAmbientControllerAdapter,
  createPlayerMovementTargetControllerAdapter,
  toCharacterRuntimeFromPlayerState
} from '../src/world/character/characterCompatibilityAdapters.ts';

test('createCharacterFromPlayerState wraps PlayerState into Character aggregate', () => {
  const player = {
    id: 'player',
    name: 'Hero',
    hp: { current: 42, max: 100 },
    currentNodeId: 'poi:shop',
    homeNodeId: 'building:home'
  };

  const character = createCharacterFromPlayerState(player, {
    cell: { x: 3, z: 5 },
    relationshipToPlayer: { stance: 'hostile', level: 0 }
  });

  assert.equal(character.getId(), 'player');
  assert.deepEqual(character.getCell(), { x: 3, z: 5 });
  assert.equal(character.getRelations().isHostileToward('player'), true);
});

test('applyCharacterToPlayerState writes Character changes back to PlayerState', () => {
  const player = {
    id: 'player',
    name: 'Old Name',
    hp: { current: 10, max: 100 },
    currentNodeId: 'a',
    homeNodeId: 'b'
  };

  const character = createCharacterFromPlayerState(player);
  character.setRuntimeState({
    cell: { x: 1, z: 1 },
    currentNodeId: 'c',
    homeNodeId: 'd',
    hpCurrent: 6
  });

  const next = applyCharacterToPlayerState(player, character);
  assert.equal(next.currentNodeId, 'c');
  assert.equal(next.homeNodeId, 'd');
  assert.equal(next.hp.current, 6);
});

test('legacy runtime DTO adapters remain available for incremental migration', () => {
  const player = {
    id: 'player',
    name: 'Hero',
    hp: { current: 42, max: 100 },
    currentNodeId: 'poi:shop',
    homeNodeId: 'building:home'
  };

  const runtime = toCharacterRuntimeFromPlayerState(player, {
    cell: { x: 3, z: 5 },
    relationship: { stance: 'hostile', level: 0 }
  });

  assert.deepEqual(runtime.identity, { id: 'player', name: 'Hero', kind: 'player' });
  assert.equal(runtime.dispositionToPlayer, 'hostile');

  const roundTrip = applyCharacterRuntimeToPlayerState(player, runtime);
  assert.equal(roundTrip.currentNodeId, 'poi:shop');
  assert.equal(roundTrip.homeNodeId, 'building:home');
});

test('createPlayerMovementTargetControllerAdapter exposes movement target as PlayerController', () => {
  let target = { x: 10, z: 4 };
  const controller = createPlayerMovementTargetControllerAdapter({
    hasTarget: () => Boolean(target),
    getTarget: () => target
  });

  assert.deepEqual(controller.issueIntent(), {
    kind: 'move',
    command: {
      destinationCell: { x: 10, z: 4 },
      source: 'player_input'
    }
  });

  target = null;
  assert.deepEqual(controller.issueIntent(), { kind: 'idle' });
});

test('createEnemyAmbientControllerAdapter emits ai intent for next patrol cell', () => {
  const behavior = { patrolCells: [{ x: 2, z: 1 }], currentPatrolIndex: 0, requestedDestinationCell: { x: 2, z: 1 } };
  const controller = createEnemyAmbientControllerAdapter(behavior);

  const character = createCharacterFromPlayerState({
    id: 'npc:1',
    name: 'NPC',
    hp: { current: 10, max: 10 },
    currentNodeId: 'a',
    homeNodeId: 'a'
  }, {
    kind: 'npc',
    cell: { x: 0, z: 0 }
  });

  assert.deepEqual(controller.issueIntent(character), {
    kind: 'move',
    command: {
      destinationCell: { x: 2, z: 1 },
      source: 'ai'
    }
  });

  character.setCell({ x: 2, z: 1 });
  assert.deepEqual(controller.issueIntent(character), { kind: 'idle' });

  behavior.requestedDestinationCell = null;
  assert.deepEqual(controller.issueIntent(character), { kind: 'idle' });
});
