import test from 'node:test';
import assert from 'node:assert/strict';

import { createPlayerActionModeStateMachine, PLAYER_ACTION_MODES } from '../src/world/combat/playerActionModeStateMachine.ts';

test('defaults to idle mode and supports valid transitions', () => {
  const machine = createPlayerActionModeStateMachine();

  assert.equal(machine.getMode(), PLAYER_ACTION_MODES.IDLE);
  assert.deepEqual(machine.setMode(PLAYER_ACTION_MODES.MOVE), { success: true, mode: PLAYER_ACTION_MODES.MOVE });
  assert.equal(machine.getMode(), PLAYER_ACTION_MODES.MOVE);
  assert.deepEqual(machine.setMode(PLAYER_ACTION_MODES.ATTACK), { success: true, mode: PLAYER_ACTION_MODES.ATTACK });
  assert.equal(machine.getMode(), PLAYER_ACTION_MODES.ATTACK);
});

test('rejects unknown mode and keeps previous mode', () => {
  const machine = createPlayerActionModeStateMachine({ initialMode: PLAYER_ACTION_MODES.MOVE });

  const result = machine.setMode('invalid_mode');
  assert.equal(result.success, false);
  assert.equal(result.reason, 'invalid_mode');
  assert.equal(machine.getMode(), PLAYER_ACTION_MODES.MOVE);
});

test('reset always returns idle mode', () => {
  const machine = createPlayerActionModeStateMachine({ initialMode: PLAYER_ACTION_MODES.ATTACK });

  machine.reset();
  assert.equal(machine.getMode(), PLAYER_ACTION_MODES.IDLE);
});
