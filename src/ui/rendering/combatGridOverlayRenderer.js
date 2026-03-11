function createGridSignature(bounds, mapper) {
  return [
    bounds.minX,
    bounds.maxX,
    bounds.minZ,
    bounds.maxZ,
    mapper.cellSize,
    mapper.originWorldX ?? 0,
    mapper.originWorldZ ?? 0
  ].join('|');
}

function buildGridLines(runtime, mapper, bounds, resolveY) {
  const lines = [];
  const minCorner = mapper.gridCellToWorld({ x: bounds.minX, z: bounds.minZ }, {
    anchor: 'corner',
    resolveY: ({ x, z }) => resolveY({ x, z })
  });
  const maxCorner = mapper.gridCellToWorld({ x: bounds.maxX + 1, z: bounds.maxZ + 1 }, {
    anchor: 'corner',
    resolveY: ({ x, z }) => resolveY({ x, z })
  });

  for (let x = bounds.minX; x <= bounds.maxX + 1; x += 1) {
    const start = mapper.gridCellToWorld({ x, z: bounds.minZ }, {
      anchor: 'corner',
      resolveY: ({ x: wx, z: wz }) => resolveY({ x: wx, z: wz })
    });
    const end = mapper.gridCellToWorld({ x, z: bounds.maxZ + 1 }, {
      anchor: 'corner',
      resolveY: ({ x: wx, z: wz }) => resolveY({ x: wx, z: wz })
    });

    lines.push([
      new runtime.BABYLON.Vector3(start.x, start.y + 0.03, minCorner.z),
      new runtime.BABYLON.Vector3(end.x, end.y + 0.03, maxCorner.z)
    ]);
  }

  for (let z = bounds.minZ; z <= bounds.maxZ + 1; z += 1) {
    const start = mapper.gridCellToWorld({ x: bounds.minX, z }, {
      anchor: 'corner',
      resolveY: ({ x: wx, z: wz }) => resolveY({ x: wx, z: wz })
    });
    const end = mapper.gridCellToWorld({ x: bounds.maxX + 1, z }, {
      anchor: 'corner',
      resolveY: ({ x: wx, z: wz }) => resolveY({ x: wx, z: wz })
    });

    lines.push([
      new runtime.BABYLON.Vector3(minCorner.x, start.y + 0.03, start.z),
      new runtime.BABYLON.Vector3(maxCorner.x, end.y + 0.03, end.z)
    ]);
  }

  return lines;
}

export function createCombatGridOverlayRenderer(runtime, options = {}) {
  const {
    combatState,
    color = '#46d7ff',
    lineAlpha = 0.9,
    resolveY = () => 0
  } = options;

  let gridMesh = null;
  let signature = '';

  const rebuildOverlay = () => {
    const mapper = combatState.gridMapper;
    const bounds = combatState.grid?.bounds;

    if (!mapper || !bounds) {
      return;
    }

    const nextSignature = createGridSignature(bounds, mapper);
    if (nextSignature === signature) {
      return;
    }

    signature = nextSignature;
    gridMesh?.dispose(false, true);

    const lines = buildGridLines(runtime, mapper, bounds, resolveY);
    gridMesh = runtime.BABYLON.MeshBuilder.CreateLineSystem('combatGridOverlay', {
      lines,
      updatable: true
    }, runtime.scene);

    gridMesh.color = runtime.BABYLON.Color3.FromHexString(color);
    gridMesh.alpha = lineAlpha;
    gridMesh.isPickable = false;
    gridMesh.checkCollisions = false;
    gridMesh.alwaysSelectAsActiveMesh = true;
    gridMesh.renderingGroupId = 1;
    gridMesh.parent = combatState.combatScene?.sceneContainer ?? null;

    if (gridMesh.material) {
      gridMesh.material.alpha = lineAlpha;
      gridMesh.material.wireframe = false;
    }

  };

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(rebuildOverlay);
  rebuildOverlay();

  return () => {
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
    gridMesh?.dispose(false, true);
    gridMesh = null;
  };
}
