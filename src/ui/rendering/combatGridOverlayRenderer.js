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
  const minXWorld = (mapper.originWorldX ?? 0) + bounds.minX * mapper.cellSize;
  const maxXWorld = (mapper.originWorldX ?? 0) + (bounds.maxX + 1) * mapper.cellSize;
  const minZWorld = (mapper.originWorldZ ?? 0) + bounds.minZ * mapper.cellSize;
  const maxZWorld = (mapper.originWorldZ ?? 0) + (bounds.maxZ + 1) * mapper.cellSize;

  for (let x = bounds.minX; x <= bounds.maxX + 1; x += 1) {
    const xWorld = (mapper.originWorldX ?? 0) + x * mapper.cellSize;
    const startY = resolveY({ x: xWorld, z: minZWorld });
    const endY = resolveY({ x: xWorld, z: maxZWorld });

    lines.push([
      new runtime.BABYLON.Vector3(xWorld, startY + 0.03, minZWorld),
      new runtime.BABYLON.Vector3(xWorld, endY + 0.03, maxZWorld)
    ]);
  }

  for (let z = bounds.minZ; z <= bounds.maxZ + 1; z += 1) {
    const zWorld = (mapper.originWorldZ ?? 0) + z * mapper.cellSize;
    const startY = resolveY({ x: minXWorld, z: zWorld });
    const endY = resolveY({ x: maxXWorld, z: zWorld });

    lines.push([
      new runtime.BABYLON.Vector3(minXWorld, startY + 0.03, zWorld),
      new runtime.BABYLON.Vector3(maxXWorld, endY + 0.03, zWorld)
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
