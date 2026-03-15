import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AIController,
  Character,
  CharacterRelations,
  PlayerController,
  dispositionFromRelationshipState
} from '../src/world/character/index.ts';

test('CharacterRelations keeps hostility as relationship-derived state', () => {
  const relations = new CharacterRelations('npc:guard', {
    player: { stance: 'hostile', level: 0 }
  });

  assert.equal(relations.getDispositionToward('player'), 'hostile');
  assert.equal(relations.isHostileToward('player'), true);
});

test('Character aggregate composes identity, controller, relations, and runtime state', () => {
  const relations = new CharacterRelations('player');
  const controller = new PlayerController(() => ({ x: 1, z: 2 }));
  const character = new Character({
    identity: { id: 'player', name: 'Hero', kind: 'player' },
    controller,
    relations,
    runtimeState: {
      cell: { x: 0, z: 0 },
      currentNodeId: 'node:a',
      homeNodeId: 'node:home',
      hpCurrent: 10
    }
  });

  assert.equal(character.getId(), 'player');
  assert.deepEqual(character.getController().issueIntent(character), {
    kind: 'move',
    command: {
      destinationCell: { x: 1, z: 2 },
      source: 'player_input'
    }
  });
  character.setCell({ x: 3, z: 4 });
  assert.deepEqual(character.getCell(), { x: 3, z: 4 });
  assert.equal(character.isAlive(), true);
});

test('PlayerController and AIController emit idle when no destination exists', () => {
  const playerController = new PlayerController(() => null);
  const aiController = new AIController(() => null);
  const character = new Character({
    identity: { id: 'npc:a', name: 'NPC', kind: 'npc' },
    controller: aiController,
    relations: new CharacterRelations('npc:a'),
    runtimeState: {
      cell: null,
      currentNodeId: null,
      homeNodeId: null,
      hpCurrent: 10
    }
  });

  assert.deepEqual(playerController.issueIntent(character), { kind: 'idle' });
  assert.deepEqual(aiController.issueIntent(character), { kind: 'idle' });
});

test('dispositionFromRelationshipState uses stance first and level thresholds second', () => {
  assert.equal(dispositionFromRelationshipState({ stance: 'hostile', level: 100 }), 'hostile');
  assert.equal(dispositionFromRelationshipState({ stance: 'friendly', level: -100 }), 'friendly');
  assert.equal(dispositionFromRelationshipState({ stance: 'neutral', level: -30 }), 'hostile');
  assert.equal(dispositionFromRelationshipState({ stance: 'neutral', level: 30 }), 'friendly');
  assert.equal(dispositionFromRelationshipState(null), 'neutral');
});
