import test from 'node:test';
import assert from 'node:assert/strict';

import { createWorldGridMapper } from '../src/world/spatial/worldGrid.ts';
import {
  findNearestValidGridCell,
  snapActorToNearestValidGridCell,
  validateActorAlignment
} from '../src/render/shared/gridAlignment.ts';

class FakeVector3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

function createActor(position, extras = {}) {
  return {
    rootNode: {
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
        copyFrom(next) {
          this.x = next.x;
          this.y = next.y;
          this.z = next.z;
        }
      },
      rotation: extras.rotation ?? { x: 0, y: 1.2, z: 0 }
    }
  };
}

test('findNearestValidGridCell chooses deterministic nearest valid cell', () => {
  const gridMapper = createWorldGridMapper({ cellSize: 1, minX: -3, maxX: 3, minZ: -3, maxZ: 3 });
  const chosen = findNearestValidGridCell({
    worldPosition: { x: 0.1, y: 0, z: 0.1 },
    gridMapper,
    isCellValid: (cell) => !(cell.x === 0 && cell.z === 0)
  });

  assert.deepEqual(chosen, { x: -1, z: 0 });
});

test('snapActorToNearestValidGridCell snaps and preserves facing transform', () => {
  const runtime = { BABYLON: { Vector3: FakeVector3 } };
  const gridMapper = createWorldGridMapper({ cellSize: 2, originWorldX: 0, originWorldZ: 0 });
  const actor = createActor({ x: 0.2, y: 3, z: 0.1 });

  const result = snapActorToNearestValidGridCell({
    runtime,
    actor,
    gridMapper,
    isCellValid: () => true,
    resolveY: ({ fallbackY }) => fallbackY,
    tolerance: 0.05,
    logger: { debug() {} },
    reason: 'test_snap'
  });

  assert.equal(result.snapped, true);
  assert.deepEqual(result.cell, { x: 0, z: 0 });
  assert.deepEqual(actor.rootNode.rotation, { x: 0, y: 1.2, z: 0 });
  assert.equal(actor.rootNode.position.x, 1);
  assert.equal(actor.rootNode.position.z, 1);
});

test('snapActorToNearestValidGridCell skips snapping when already aligned in tolerance', () => {
  const runtime = { BABYLON: { Vector3: FakeVector3 } };
  const gridMapper = createWorldGridMapper({ cellSize: 1, originWorldX: 0, originWorldZ: 0 });
  const actor = createActor({ x: 0.51, y: 0, z: 0.5 });

  const alignmentBefore = validateActorAlignment({ actor, gridMapper, tolerance: 0.05 });
  assert.equal(alignmentBefore.aligned, true);

  const result = snapActorToNearestValidGridCell({
    runtime,
    actor,
    gridMapper,
    isCellValid: () => true,
    resolveY: ({ fallbackY }) => fallbackY,
    tolerance: 0.05,
    logger: { debug() {} },
    reason: 'test_noop'
  });

  assert.equal(result.snapped, false);
  assert.equal(result.reason, 'already_aligned');
  assert.equal(actor.rootNode.position.x, 0.51);
  assert.equal(actor.rootNode.position.z, 0.5);
});
