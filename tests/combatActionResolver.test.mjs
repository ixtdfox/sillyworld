import test from 'node:test';
import assert from 'node:assert/strict';

import { createCombatActionResolver } from '../src/world/combat/ActionResolver.ts';

function makeUnit(overrides = {}) {
  return {
    id: 'unit_1',
    team: 'player',
    ap: 2,
    hp: 20,
    isAlive: true,
    gridCell: { x: 0, z: 0 },
    attackRange: 1,
    attackPower: 4,
    ...overrides
  };
}

test('blocks basic attack when it is not attackers turn', () => {
  const resolver = createCombatActionResolver();
  const attacker = makeUnit({ id: 'player_1' });
  const target = makeUnit({ id: 'enemy_1', team: 'enemy', gridCell: { x: 1, z: 0 } });

  const result = resolver.resolveBasicAttack({
    attacker,
    target,
    activeUnitId: 'enemy_1'
  });

  assert.equal(result.success, false);
  assert.equal(result.reason, 'not_attackers_turn');
  assert.equal(attacker.ap, 2);
  assert.equal(target.hp, 20);
});

test('blocks basic attack when target is out of range', () => {
  const resolver = createCombatActionResolver();
  const attacker = makeUnit({ id: 'player_1' });
  const target = makeUnit({ id: 'enemy_1', team: 'enemy', gridCell: { x: 3, z: 0 } });

  const result = resolver.resolveBasicAttack({
    attacker,
    target,
    activeUnitId: 'player_1'
  });

  assert.equal(result.success, false);
  assert.equal(result.reason, 'target_out_of_range');
  assert.equal(attacker.ap, 2);
  assert.equal(target.hp, 20);
});

test('resolves basic attack, spends AP, and marks death', () => {
  const resolver = createCombatActionResolver();
  const attacker = makeUnit({ id: 'player_1', attackPower: 6 });
  const target = makeUnit({ id: 'enemy_1', team: 'enemy', hp: 5, gridCell: { x: 1, z: 0 } });

  const result = resolver.resolveBasicAttack({
    attacker,
    target,
    activeUnitId: 'player_1'
  });

  assert.equal(result.success, true);
  assert.equal(result.apCost, 1);
  assert.equal(attacker.ap, 1);
  assert.equal(target.hp, 0);
  assert.equal(target.isAlive, false);
  assert.equal(result.targetDied, true);
});

test('evaluates victory and defeat outcomes', () => {
  const resolver = createCombatActionResolver();
  const player = makeUnit({ id: 'player_1', team: 'player' });
  const enemy = makeUnit({ id: 'enemy_1', team: 'enemy', hp: 0, isAlive: false });

  const victory = resolver.evaluateCombatOutcome([player, enemy]);
  assert.deepEqual(victory, { ended: true, result: 'victory' });

  player.hp = 0;
  player.isAlive = false;
  const defeat = resolver.evaluateCombatOutcome([player, enemy]);
  assert.deepEqual(defeat, { ended: true, result: 'defeat' });
});
