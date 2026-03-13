import test from 'node:test';
import assert from 'node:assert/strict';

import { tryParseCellFromHighlightMeshName, tryResolveCellFromPickResult } from '../src/world/combat/combatCellSelection.ts';

test('tryParseCellFromHighlightMeshName parses valid names', () => {
  assert.deepEqual(tryParseCellFromHighlightMeshName('combatMoveHighlight_3_4'), { x: 3, z: 4 });
});

test('tryResolveCellFromPickResult uses metadata first', () => {
  const cell = tryResolveCellFromPickResult({
    hit: true,
    pickedPoint: { x: 1, y: 0, z: 1 },
    pickedMesh: { metadata: { combatGridCell: { x: 8.8, z: 2.1 } } }
  }, {
    worldToGridCell: () => ({ x: 0, z: 0 })
  });

  assert.deepEqual(cell, { x: 8, z: 2 });
});
