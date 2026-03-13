import test from 'node:test';
import assert from 'node:assert/strict';

import { isCombatGuiPick, pickCombatCellAtPointer, tryResolveCellFromPick } from '../src/ui/rendering/combat/combatCellPointer.ts';

test('resolves grid cell from highlight mesh name', () => {
  const cell = tryResolveCellFromPick({
    hit: true,
    pickedPoint: { x: 999, y: 0, z: 999 },
    pickedMesh: { name: 'combatMoveHighlight_4_-2' }
  }, {
    worldToGridCell: () => ({ x: 0, z: 0 })
  });

  assert.deepEqual(cell, { x: 4, z: -2 });
});

test('resolves grid cell from metadata before world mapping', () => {
  const cell = tryResolveCellFromPick({
    hit: true,
    pickedPoint: { x: 999, y: 0, z: 999 },
    pickedMesh: {
      name: 'ground',
      metadata: {
        combatGridCell: { x: 7.9, z: 3.1 }
      }
    }
  }, {
    worldToGridCell: () => ({ x: 0, z: 0 })
  });

  assert.deepEqual(cell, { x: 7, z: 3 });
});

test('pickCombatCellAtPointer suppresses HUD mesh picks', () => {
  const runtime = {
    scene: {
      pointerX: 1,
      pointerY: 1,
      pick: () => ({
        hit: true,
        pickedPoint: { x: 1, y: 0, z: 1 },
        pickedMesh: {
          metadata: {
            isCombatHudControl: true
          }
        }
      })
    }
  };

  const result = pickCombatCellAtPointer(runtime, {
    worldToGridCell: () => ({ x: 1, z: 1 })
  });

  assert.equal(isCombatGuiPick(result.pickResult), true);
  assert.equal(result.cell, null);
});
