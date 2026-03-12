// @ts-nocheck
function createCellSignature(cells) {
  return cells
    .map((cell) => `${cell.x},${cell.z}`)
    .sort()
    .join('|');
}

function disposeHighlights(highlightsByCell) {
  for (const mesh of highlightsByCell.values()) {
    mesh.dispose(false, true);
  }
  highlightsByCell.clear();
}

function createHighlightMesh(runtime, combatState, gridMapper, resolveY, cell, color, alpha) {
  const cellSize = gridMapper.cellSize;
  const world = gridMapper.gridCellToWorld(cell, {
    resolveY: ({ x, z }) => resolveY({ x, z })
  });

  const mesh = runtime.BABYLON.MeshBuilder.CreateGround(`combatMoveHighlight_${cell.x}_${cell.z}`, {
    width: cellSize * 0.92,
    height: cellSize * 0.92,
    subdivisions: 1
  }, runtime.scene);

  mesh.position.x = world.x;
  mesh.position.z = world.z;
  mesh.position.y = world.y + 0.04;
  mesh.isPickable = false;
  mesh.checkCollisions = false;
  mesh.alwaysSelectAsActiveMesh = true;
  mesh.renderingGroupId = 1;
  mesh.parent = combatState.combatScene?.sceneContainer ?? null;

  const material = new runtime.BABYLON.StandardMaterial(`combatMoveHighlightMat_${cell.x}_${cell.z}`, runtime.scene);
  material.diffuseColor = runtime.BABYLON.Color3.FromHexString(color);
  material.emissiveColor = runtime.BABYLON.Color3.FromHexString(color).scale(0.4);
  material.specularColor = runtime.BABYLON.Color3.Black();
  material.alpha = alpha;
  material.backFaceCulling = false;

  mesh.material = material;

  return mesh;
}

export function createCombatMovementRangeHighlighter(runtime, options = {}) {
  const {
    combatState,
    playerUnit,
    grid,
    gridMapper,
    resolveY = () => 0,
    isVisible = () => true,
    color = '#45b8ff',
    alpha = 0.3,
    movementCost
  } = options;

  const highlightsByCell = new Map();
  let cacheSignature = '';
  let layerVisible = true;

  const clear = () => {
    cacheSignature = '';
    disposeHighlights(highlightsByCell);
  };

  const render = () => {
    const activeUnit = combatState.getActiveUnit?.() ?? null;
    const shouldShow = (
      combatState.status === 'active'
      && combatState.phase === 'turn_active'
      && activeUnit?.id === playerUnit.id
      && layerVisible
      && isVisible()
      && playerUnit.isAlive
    );

    if (!shouldShow) {
      clear();
      return;
    }

    const reachableCells = grid.getReachableCells(playerUnit.gridCell, playerUnit.mp, {
      allowOccupiedByUnitId: playerUnit.id,
      movementCost
    }).filter((cell) => !(cell.x === playerUnit.gridCell.x && cell.z === playerUnit.gridCell.z));

    const nextSignature = [
      playerUnit.gridCell.x,
      playerUnit.gridCell.z,
      playerUnit.mp,
      grid.getOccupancyRevision?.() ?? 0,
      createCellSignature(reachableCells)
    ].join('|');

    if (nextSignature === cacheSignature) {
      return;
    }

    cacheSignature = nextSignature;
    disposeHighlights(highlightsByCell);

    for (const cell of reachableCells) {
      const key = grid.toCellKey(cell);
      const mesh = createHighlightMesh(runtime, combatState, gridMapper, resolveY, cell, color, alpha);
      highlightsByCell.set(key, mesh);
    }
  };

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(render);
  render();

  const controller = {
    setVisible: (visible) => {
      layerVisible = visible !== false;
      if (!layerVisible) {
        clear();
      }
    },
    dispose: () => {
      runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      clear();
    }
  };

  return controller;
}
