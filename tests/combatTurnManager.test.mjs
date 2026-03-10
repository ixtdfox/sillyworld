import test from 'node:test';
import assert from 'node:assert/strict';

import { createCombatTurnManager } from '../src/ui/rendering/combatTurnManager.js';

function makeUnit(id, team, initiative) {
  return { id, team, initiative };
}

test('combat turn manager orders units by initiative', () => {
  const turnManager = createCombatTurnManager([
    makeUnit('enemy_1', 'enemy', 5),
    makeUnit('player_1', 'player', 100)
  ]);

  const state = turnManager.getState();
  assert.deepEqual(
    state.orderedUnits.map((unit) => unit.unitId),
    ['player_1', 'enemy_1']
  );
});

test('combat turn manager cycles turns and increments rounds', () => {
  const turnManager = createCombatTurnManager([
    makeUnit('player_1', 'player', 100),
    makeUnit('enemy_1', 'enemy', 10)
  ]);

  turnManager.startCombat();
  turnManager.startTurn();
  let state = turnManager.getState();
  assert.equal(state.phase, 'turn_active');
  assert.equal(state.roundNumber, 1);
  assert.equal(state.activeUnitId, 'player_1');

  turnManager.endTurn();
  turnManager.advanceToNextUnit();
  turnManager.startTurn();
  state = turnManager.getState();
  assert.equal(state.roundNumber, 1);
  assert.equal(state.activeUnitId, 'enemy_1');

  turnManager.endTurn();
  turnManager.advanceToNextUnit();
  turnManager.startTurn();
  state = turnManager.getState();
  assert.equal(state.roundNumber, 2);
  assert.equal(state.activeUnitId, 'player_1');
});
