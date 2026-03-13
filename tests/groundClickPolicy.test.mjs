import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveGroundClickTarget } from '../src/world/input/groundClickPolicy.ts';

test('resolveGroundClickTarget accepts ground pick', () => {
  const result = resolveGroundClickTarget({
    hit: true,
    pickedMesh: { name: 'Ground', parent: null },
    pickedPoint: { clone: () => ({ x: 1, y: 2, z: 3 }) }
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(result.target, { x: 1, y: 2, z: 3 });
});

test('resolveGroundClickTarget rejects blocked mesh', () => {
  const result = resolveGroundClickTarget({
    hit: true,
    pickedMesh: { name: 'Wall', parent: null },
    pickedPoint: { clone: () => ({ x: 1, y: 2, z: 3 }) }
  });

  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'blocked-mesh');
});
