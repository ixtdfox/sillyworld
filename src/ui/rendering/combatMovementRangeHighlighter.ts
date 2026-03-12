// @ts-nocheck
import { createCombatBattlefieldVisualization } from './combatBattlefieldVisualization.ts';

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

function createHighlightMesh(runtime, battlefieldView, cell, color, alpha) {
  const mapper = battlefieldView.getGridMapper();
  const cellSize = mapper.cellSize;
  const world = battlefieldView.gridCellToWorld(cell);

  const mesh = runtime.BABYLON.MeshBuilder.CreateGround(`combatMoveHighlight_${cell.x}_${cell.z}`, {
    width: cellSize * 0.92,
    height: cellSize * 0.92,
    subdivisions: 1
  }, runtime.scene);

  mesh.position.x = world.x;
  mesh.position.z = world.z;

  battlefieldView.attachToBattlefieldLayer(mesh, 0.04);

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
    resolveY = () => 0,
    isVisible = () => true,
    color = '#45b8ff',
    alpha = 0.3,
    movementCost
  } = options;

  const battlefieldView = createCombatBattlefieldVisualization(runtime, {
    combatState,
    resolveY
  });

  const highlightsByCell = new Map();
  let cacheSignature = '';

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
      && layer.shouldRender()
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
      const mesh = createHighlightMesh(runtime, battlefieldView, cell, color, alpha);
      highlightsByCell.set(key, mesh);
    }
  };

  const layer = battlefieldView.createLayerController(render, clear);
  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(layer.render);
  layer.render();

  return {
    setVisible: layer.setVisible,
    dispose: () => {
      runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      layer.clear();
    }
  };
}
