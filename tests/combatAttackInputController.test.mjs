import test from 'node:test';
import assert from 'node:assert/strict';

import { attachCombatAttackInputController } from '../src/ui/rendering/combat/combatAttackInputController.ts';

function createObservable() {
  let observer = null;
  return {
    add: (cb) => {
      observer = cb;
      return cb;
    },
    remove: () => {
      observer = null;
    },
    emit: (payload) => {
      observer?.(payload);
    }
  };
}

function createRuntime() {
  const pointer = createObservable();
  const beforeRender = createObservable();
  let pickResult = null;

  return {
    BABYLON: {
      PointerEventTypes: {
        POINTERDOWN: 1,
        POINTERMOVE: 2
      }
    },
    scene: {
      pointerX: 0,
      pointerY: 0,
      pick: () => pickResult,
      onPointerObservable: pointer,
      onBeforeRenderObservable: beforeRender
    },
    setPickResult: (result) => {
      pickResult = result;
    },
    pointerDown: (payload = {}) => pointer.emit({ type: 1, event: { button: 0 }, ...payload }),
    pointerMove: () => pointer.emit({ type: 2 }),
    tick: () => beforeRender.emit()
  };
}

function createMesh(name, parent = null) {
  return {
    name,
    parent,
    renderOutline: false,
    outlineWidth: 0,
    getChildMeshes: () => []
  };
}

test('selects enemy target in attack mode and performs attack on click', () => {
  const runtime = createRuntime();
  const enemyRoot = createMesh('enemy_root');
  const enemyChild = createMesh('enemy_child', enemyRoot);
  enemyRoot.getChildMeshes = () => [enemyChild];

  const combatState = {
    status: 'active',
    inputMode: 'attack',
    selectedTargetId: null,
    getActiveUnit: () => ({ id: 'player_1' }),
    tryBasicAttack: ({ attackerId, targetId }) => ({ success: true, action: 'basic_attack', attackerId, targetId, damage: 4 })
  };

  const detach = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: { id: 'player_1' },
    getPotentialTargets: () => [{ unit: { id: 'enemy_1', isAlive: true }, targetRoot: enemyRoot }],
    isAttackEnabled: () => combatState.inputMode === 'attack'
  });

  runtime.setPickResult({ hit: true, pickedMesh: enemyChild });
  runtime.pointerMove();
  assert.equal(combatState.selectedTargetId, 'enemy_1');
  assert.equal(enemyRoot.renderOutline, true);

  runtime.pointerDown();
  assert.equal(combatState.lastActionResult.success, true);
  assert.equal(combatState.lastActionResult.targetId, 'enemy_1');

  detach();
});

test('ignores target clicks when attack mode is disabled and clears selection', () => {
  const runtime = createRuntime();
  const enemyRoot = createMesh('enemy_root');

  let attackCalls = 0;
  const combatState = {
    status: 'active',
    inputMode: 'attack',
    selectedTargetId: null,
    getActiveUnit: () => ({ id: 'player_1' }),
    tryBasicAttack: () => {
      attackCalls += 1;
      return { success: true };
    }
  };

  const detach = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: { id: 'player_1' },
    getPotentialTargets: () => [{ unit: { id: 'enemy_1', isAlive: true }, targetRoot: enemyRoot }],
    isAttackEnabled: () => combatState.inputMode === 'attack'
  });

  runtime.setPickResult({ hit: true, pickedMesh: enemyRoot });
  runtime.pointerMove();
  assert.equal(enemyRoot.renderOutline, true);

  combatState.inputMode = 'move';
  runtime.tick();
  runtime.pointerDown();

  assert.equal(attackCalls, 0);
  assert.equal(combatState.selectedTargetId, null);
  assert.equal(enemyRoot.renderOutline, false);

  detach();
});

test('stores failed attack result without mutating selection state', () => {
  const runtime = createRuntime();
  const enemyRoot = createMesh('enemy_root');

  const combatState = {
    status: 'active',
    inputMode: 'attack',
    selectedTargetId: null,
    getActiveUnit: () => ({ id: 'player_1' }),
    tryBasicAttack: () => ({ success: false, reason: 'target_out_of_range' })
  };

  const detach = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: { id: 'player_1' },
    getPotentialTargets: () => [{ unit: { id: 'enemy_1', isAlive: true }, targetRoot: enemyRoot }],
    isAttackEnabled: () => true
  });

  runtime.setPickResult({ hit: true, pickedMesh: enemyRoot });
  runtime.pointerDown();

  assert.equal(combatState.lastActionResult.success, false);
  assert.equal(combatState.lastActionResult.reason, 'target_out_of_range');
  assert.equal(combatState.selectedTargetId, 'enemy_1');

  detach();
});

test('does not allow attack input when it is not attacker turn', () => {
  const runtime = createRuntime();
  const enemyRoot = createMesh('enemy_root');

  let attackCalls = 0;
  const combatState = {
    status: 'active',
    inputMode: 'attack',
    selectedTargetId: null,
    getActiveUnit: () => ({ id: 'enemy_1' }),
    tryBasicAttack: () => {
      attackCalls += 1;
      return { success: true };
    }
  };

  const detach = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: { id: 'player_1' },
    getPotentialTargets: () => [{ unit: { id: 'enemy_1', isAlive: true }, targetRoot: enemyRoot }],
    isAttackEnabled: () => true
  });

  runtime.setPickResult({ hit: true, pickedMesh: enemyRoot });
  runtime.pointerMove();
  runtime.pointerDown();

  assert.equal(attackCalls, 0);
  assert.equal(combatState.selectedTargetId, null);
  assert.equal(enemyRoot.renderOutline, false);

  detach();
});


test('ignores right-click target confirmation while allowing hover selection', () => {
  const runtime = createRuntime();
  const enemyRoot = createMesh('enemy_root');

  let attackCalls = 0;
  const combatState = {
    status: 'active',
    inputMode: 'attack',
    selectedTargetId: null,
    getActiveUnit: () => ({ id: 'player_1' }),
    tryBasicAttack: () => {
      attackCalls += 1;
      return { success: true };
    }
  };

  const detach = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: { id: 'player_1' },
    getPotentialTargets: () => [{ unit: { id: 'enemy_1', isAlive: true }, targetRoot: enemyRoot }],
    isAttackEnabled: () => combatState.inputMode === 'attack'
  });

  runtime.setPickResult({ hit: true, pickedMesh: enemyRoot });
  runtime.pointerMove();
  runtime.pointerDown({ event: { button: 2 } });

  assert.equal(combatState.selectedTargetId, 'enemy_1');
  assert.equal(attackCalls, 0);
  detach();
});

test('clears attack hover selection while camera orbit drag is active', () => {
  const runtime = createRuntime();
  runtime.inputState = { camera: { isOrbiting: true } };
  const enemyRoot = createMesh('enemy_root');

  const combatState = {
    status: 'active',
    inputMode: 'attack',
    selectedTargetId: null,
    getActiveUnit: () => ({ id: 'player_1' }),
    tryBasicAttack: () => ({ success: true })
  };

  const detach = attachCombatAttackInputController(runtime, {
    combatState,
    attackerUnit: { id: 'player_1' },
    getPotentialTargets: () => [{ unit: { id: 'enemy_1', isAlive: true }, targetRoot: enemyRoot }],
    isAttackEnabled: () => true
  });

  runtime.setPickResult({ hit: true, pickedMesh: enemyRoot });
  runtime.pointerMove();

  assert.equal(combatState.selectedTargetId, null);
  assert.equal(enemyRoot.renderOutline, false);
  detach();
});
