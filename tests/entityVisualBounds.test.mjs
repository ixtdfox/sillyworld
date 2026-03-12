import test from 'node:test';
import assert from 'node:assert/strict';

import {
  alignEntityToGround,
  getEntityBottomY,
  getEntityVisualHeight,
  placeEntityOnGround,
  readEntityBoundingBox,
  refreshEntityWorldMatrices
} from '../src/ui/rendering/entityVisualBounds.ts';

test('refreshEntityWorldMatrices updates root descendants and child meshes', () => {
  let rootComputeCount = 0;
  let descendantComputeCount = 0;
  let meshComputeCount = 0;
  let refreshBoundingCount = 0;

  const descendant = {
    computeWorldMatrix() {
      descendantComputeCount += 1;
    }
  };

  const mesh = {
    computeWorldMatrix() {
      meshComputeCount += 1;
    },
    refreshBoundingInfo() {
      refreshBoundingCount += 1;
    }
  };

  const rootNode = {
    computeWorldMatrix() {
      rootComputeCount += 1;
    },
    getDescendants() {
      return [descendant];
    },
    getChildMeshes() {
      return [mesh];
    }
  };

  refreshEntityWorldMatrices({ rootNode });

  assert.equal(rootComputeCount, 1);
  assert.equal(descendantComputeCount, 1);
  assert.equal(meshComputeCount, 1);
  assert.equal(refreshBoundingCount, 1);
});

test('reads full bounding box for imported hierarchy and exposes height/bottom Y helpers', () => {
  const rootNode = {
    computeWorldMatrix() {},
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [
        {
          computeWorldMatrix() {},
          refreshBoundingInfo() {}
        },
        {
          computeWorldMatrix() {},
          refreshBoundingInfo() {}
        }
      ];
    },
    getHierarchyBoundingVectors() {
      return {
        min: { x: -1.5, y: -0.25, z: -2 },
        max: { x: 1.25, y: 3.75, z: 2.5 }
      };
    }
  };

  const bounds = readEntityBoundingBox(rootNode);
  assert.deepEqual(bounds, {
    min: { x: -1.5, y: -0.25, z: -2 },
    max: { x: 1.25, y: 3.75, z: 2.5 }
  });
  assert.equal(getEntityVisualHeight(rootNode), 4);
  assert.equal(getEntityBottomY(rootNode), -0.25);
});

test('returns null/NaN when hierarchy bounds are unavailable', () => {
  const rootNode = {
    computeWorldMatrix() {},
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [];
    },
    getHierarchyBoundingVectors() {
      return null;
    }
  };

  assert.equal(readEntityBoundingBox(rootNode), null);
  assert.ok(Number.isNaN(getEntityVisualHeight(rootNode)));
  assert.ok(Number.isNaN(getEntityBottomY(rootNode)));
});


test('placeEntityOnGround repositions bottom Y to ground with optional offset', () => {
  const rootNode = {
    position: { y: 2 },
    computeWorldMatrix() {},
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [];
    },
    getHierarchyBoundingVectors() {
      return {
        min: { x: -1, y: 1.5, z: -1 },
        max: { x: 1, y: 3.5, z: 1 }
      };
    }
  };

  const newPositionY = placeEntityOnGround(rootNode, { groundOffset: 0.25 });

  assert.equal(newPositionY, 0.75);
  assert.equal(rootNode.position.y, 0.75);
});

test('alignEntityToGround alias matches placeEntityOnGround behavior', () => {
  const rootNode = {
    position: { y: 0 },
    computeWorldMatrix() {},
    getDescendants() {
      return [];
    },
    getChildMeshes() {
      return [];
    },
    getHierarchyBoundingVectors() {
      return {
        min: { x: -1, y: -0.4, z: -1 },
        max: { x: 1, y: 1.6, z: 1 }
      };
    }
  };

  const newPositionY = alignEntityToGround(rootNode);

  assert.equal(newPositionY, 0.4);
  assert.equal(rootNode.position.y, 0.4);
});
