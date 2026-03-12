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

function ensureOverlayAssets(runtime, state, color, alpha) {
  if (state.material && state.texture) {
    return state;
  }

  const texture = new runtime.BABYLON.DynamicTexture('combatMoveOverlayTexture', {
    width: 256,
    height: 256
  }, runtime.scene, false);
  const context = texture.getContext();
  const center = 128;
  const border = 18;
  const fillColor = runtime.BABYLON.Color3.FromHexString(color);
  const rgb = fillColor.toLinearSpace().scale(255);
  const tint = `rgba(${Math.trunc(rgb.r)}, ${Math.trunc(rgb.g)}, ${Math.trunc(rgb.b)}, ${alpha})`;
  const glowTint = `rgba(${Math.trunc(rgb.r)}, ${Math.trunc(rgb.g)}, ${Math.trunc(rgb.b)}, ${Math.min(1, alpha + 0.25)})`;

  context.clearRect(0, 0, 256, 256);
  context.fillStyle = 'rgba(0, 0, 0, 0)';
  context.fillRect(0, 0, 256, 256);

  const gradient = context.createRadialGradient(center, center, 12, center, center, center - border);
  gradient.addColorStop(0, glowTint);
  gradient.addColorStop(0.65, tint);
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = gradient;
  context.fillRect(border, border, 256 - border * 2, 256 - border * 2);

  context.strokeStyle = glowTint;
  context.lineWidth = 8;
  context.strokeRect(border, border, 256 - border * 2, 256 - border * 2);
  texture.update(false);

  const material = new runtime.BABYLON.StandardMaterial('combatMoveHighlightMaterial', runtime.scene);
  material.diffuseColor = runtime.BABYLON.Color3.Black();
  material.specularColor = runtime.BABYLON.Color3.Black();
  material.emissiveColor = fillColor.scale(0.9);
  material.alpha = alpha;
  material.opacityTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = false;
  material.backFaceCulling = false;
  material.disableLighting = true;

  state.texture = texture;
  state.material = material;
  return state;
}

function createHighlightMesh(runtime, battlefieldView, cell, overlayState) {
  const mapper = battlefieldView.getGridMapper();
  const cellSize = mapper.cellSize;
  const world = battlefieldView.gridCellToWorld(cell);

  const mesh = runtime.BABYLON.MeshBuilder.CreateGround(`combatMoveHighlight_${cell.x}_${cell.z}`, {
    width: cellSize * 0.94,
    height: cellSize * 0.94,
    subdivisions: 1
  }, runtime.scene);

  mesh.position.x = world.x;
  mesh.position.z = world.z;

  battlefieldView.attachToBattlefieldLayer(mesh, 0.04);
  mesh.material = overlayState.material;

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
  const overlayState = {
    material: null,
    texture: null
  };
  let cacheSignature = '';

  const clear = () => {
    cacheSignature = '';
    disposeHighlights(highlightsByCell);
  };

  const syncOverlayPulse = () => {
    if (!overlayState.material) {
      return;
    }

    const pulse = 0.9 + Math.sin(performance.now() * 0.004) * 0.18;
    overlayState.material.alpha = Math.min(0.82, Math.max(0.2, alpha * pulse));
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
      syncOverlayPulse();
      return;
    }

    cacheSignature = nextSignature;
    disposeHighlights(highlightsByCell);
    ensureOverlayAssets(runtime, overlayState, color, alpha);

    for (const cell of reachableCells) {
      const key = grid.toCellKey(cell);
      const mesh = createHighlightMesh(runtime, battlefieldView, cell, overlayState);
      highlightsByCell.set(key, mesh);
    }

    syncOverlayPulse();
  };

  const layer = battlefieldView.createLayerController(render, clear);
  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(layer.render);
  layer.render();

  return {
    setVisible: layer.setVisible,
    dispose: () => {
      runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      layer.clear();
      overlayState.material?.dispose(false, true);
      overlayState.texture?.dispose();
    }
  };
}
