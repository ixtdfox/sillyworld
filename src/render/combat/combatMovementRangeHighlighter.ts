// @ts-nocheck
/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
import { createCombatBattlefieldVisualization } from './combatBattlefieldVisualization.ts';
import { pickCombatCellAtPointer } from '../../world/combat/combatCellPointer.ts';
import {CombatCellPicker} from "../../world/combat/input/CombatCellPicker.ts";

/** Создаёт и настраивает `createCellSignature` в ходе выполнения связанного игрового сценария. */
function createCellSignature(cells) {
  return cells
    .map((cell) => `${cell.x},${cell.z}`)
    .sort()
    .join('|');
}

/** Выполняет `disposeHighlights` в ходе выполнения связанного игрового сценария. */
function disposeHighlights(highlightsByCell) {
  for (const mesh of highlightsByCell.values()) {
    mesh.dispose();
  }
  highlightsByCell.clear();
}

/** Создаёт и настраивает `createPathSignature` в ходе выполнения связанного игрового сценария. */
function createPathSignature(pathCells) {
  if (!Array.isArray(pathCells) || pathCells.length <= 1) {
    return '';
  }

  return pathCells.map((cell) => `${cell.x},${cell.z}`).join('>');
}

/** Выполняет `ensureOverlayAssets` в ходе выполнения связанного игрового сценария. */
function ensureOverlayAssets(runtime, state, color, alpha, options = {}) {
  const key = `${color}|${alpha}|${options.namePrefix ?? 'default'}`;
  if (state.material && state.texture && state.key === key) {
    return state;
  }

  state.material?.dispose(false, true);
  state.texture?.dispose();

  const texture = new runtime.BABYLON.DynamicTexture(`${options.namePrefix ?? 'combatMove'}OverlayTexture`, {
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

  const material = new runtime.BABYLON.StandardMaterial(`${options.namePrefix ?? 'combatMove'}HighlightMaterial`, runtime.scene);
  material.diffuseColor = runtime.BABYLON.Color3.Black();
  material.specularColor = runtime.BABYLON.Color3.Black();
  material.emissiveColor = fillColor.scale(options.emissiveMultiplier ?? 0.9);
  material.alpha = alpha;
  material.opacityTexture = texture;
  material.emissiveTexture = texture;
  material.useAlphaFromDiffuseTexture = false;
  material.backFaceCulling = false;
  material.disableLighting = true;

  state.key = key;
  state.texture = texture;
  state.material = material;
  return state;
}

/** Создаёт и настраивает `createHighlightMesh` в ходе выполнения связанного игрового сценария. */
function createHighlightMesh(runtime, battlefieldView, cell, overlayState, meshConfig = {}) {
  const mapper = battlefieldView.getGridMapper();
  const cellSize = mapper.cellSize;
  const world = battlefieldView.gridCellToWorld(cell);

  const mesh = runtime.BABYLON.MeshBuilder.CreateGround(meshConfig.name ?? `combatMoveHighlight_${cell.x}_${cell.z}`, {
    width: cellSize * (meshConfig.scale ?? 0.94),
    height: cellSize * (meshConfig.scale ?? 0.94),
    subdivisions: 1
  }, runtime.scene);

  mesh.position.x = world.x;
  mesh.position.z = world.z;

  battlefieldView.attachToBattlefieldLayer(mesh, meshConfig.yOffset ?? 0.04);
  mesh.material = overlayState.material;

  return mesh;
}

/** Создаёт и настраивает `createCombatMovementRangeHighlighter` в ходе выполнения связанного игрового сценария. */
export function createCombatMovementRangeHighlighter(runtime, options = {}) {
  const {
    combatState,
    playerUnit,
    grid,
    resolveY = () => 0,
    isVisible = () => true,
    color = '#45b8ff',
    alpha = 0.3,
    movementCost,
    hoverReachableColor = '#8ef9ff',
    hoverReachableAlpha = 0.65,
    hoverInvalidColor = '#ff667d',
    hoverInvalidAlpha = 0.4
  } = options;

  const battlefieldView = createCombatBattlefieldVisualization(runtime, {
    combatState,
    resolveY
  });

  const highlightsByCell = new Map();
  const overlayState = {
    key: '',
    material: null,
    texture: null
  };
  const hoverReachableOverlayState = {
    key: '',
    material: null,
    texture: null
  };
  const hoverInvalidOverlayState = {
    key: '',
    material: null,
    texture: null
  };
  const pathOverlayState = {
    key: '',
    material: null,
    texture: null
  };
  let hoverMesh = null;
  let pathPreviewSignature = '';
  const pathPreviewMeshes = [];
  let cacheSignature = '';

  const clearPathPreview = () => {
    pathPreviewSignature = '';
    combatState.hoveredMovementPath = null;
    while (pathPreviewMeshes.length) {
      pathPreviewMeshes.pop()?.dispose(false, false);
    }
  };

  const syncPathPreview = (pathCells) => {

    const nextSignature = createPathSignature(pathCells);
    if (!nextSignature) {
      clearPathPreview();
      return;
    }

    combatState.hoveredMovementPath = pathCells.map((cell) => ({ x: cell.x, z: cell.z }));
    if (nextSignature === pathPreviewSignature) {
      return;
    }

    pathPreviewSignature = nextSignature;
    while (pathPreviewMeshes.length) {
      pathPreviewMeshes.pop()?.dispose(false, false);
    }

    const mapper = battlefieldView.getGridMapper();
    const pathMaterial = ensureOverlayAssets(runtime, pathOverlayState, '#ffe066', 0.7, {
      emissiveMultiplier: 1.25,
      namePrefix: 'combatMovePathPreview'
    }).material;

    for (let index = 0; index < pathCells.length - 1; index += 1) {
      const fromWorld = battlefieldView.gridCellToWorld(pathCells[index]);
      const toWorld = battlefieldView.gridCellToWorld(pathCells[index + 1]);
      if (!fromWorld || !toWorld) {
        continue;
      }

      const dx = toWorld.x - fromWorld.x;
      const dz = toWorld.z - fromWorld.z;
      const segmentLength = Math.hypot(dx, dz);

      const segment = runtime.BABYLON.MeshBuilder.CreateGround(`combatMovePathSegment_${index}`, {
        width: mapper.cellSize * 0.22,
        height: Math.max(mapper.cellSize * 0.22, segmentLength * 0.9),
        subdivisions: 1
      }, runtime.scene);

      segment.position.x = fromWorld.x + dx * 0.5;
      segment.position.z = fromWorld.z + dz * 0.5;
      segment.rotation = segment.rotation ?? { x: 0, y: 0, z: 0 };
      segment.rotation.y = Math.atan2(dx, dz);
      segment.material = pathMaterial;
      battlefieldView.attachToBattlefieldLayer(segment, 0.09);
      pathPreviewMeshes.push(segment);
    }
  };

  const clearHover = () => {
    hoverMesh?.dispose(false, false);
    hoverMesh = null;
    combatState.hoveredMovementDestination = null;
    clearPathPreview();
  };

  const clear = () => {

    cacheSignature = '';
    disposeHighlights(highlightsByCell);
    clearHover();
  };

  const syncOverlayPulse = () => {
    if (!overlayState.material) {
      return;
    }

    const pulse = 0.9 + Math.sin(performance.now() * 0.004) * 0.18;
    overlayState.material.alpha = Math.min(0.82, Math.max(0.2, alpha * pulse));
  };



  const syncHoverPreview = (reachableCellKeySet) => {
    const picker = new CombatCellPicker();
    const { cell: hoveredCell } = picker.pickCombatCellAtPointer(runtime, combatState.gridMapper);

    if (!hoveredCell || !grid.isWithinBounds?.(hoveredCell) || combatState.playerMovementInProgress) {
      clearHover();
      return;
    }

    const hoverCellKey = grid.toCellKey(hoveredCell);
    const isReachable = reachableCellKeySet.has(hoverCellKey);

    combatState.hoveredMovementDestination = {
      cell: { x: hoveredCell.x, z: hoveredCell.z },
      isReachable
    };

    if (isReachable) {
      const path = grid.findPath(playerUnit.gridCell, hoveredCell, {
        allowOccupiedByUnitId: playerUnit.id,
        movementCost
      });

      const pathSignature = Array.isArray(path)
          ? path.map((cell) => `${cell.x},${cell.z}`).join('>')
          : 'INVALID';

      syncPathPreview(path);
    } else {
      clearPathPreview();
    }

    const desiredMaterial = isReachable
        ? ensureOverlayAssets(runtime, hoverReachableOverlayState, hoverReachableColor, hoverReachableAlpha, {
          emissiveMultiplier: 1.15,
          namePrefix: 'combatMoveHoverReachable'
        }).material
        : ensureOverlayAssets(runtime, hoverInvalidOverlayState, hoverInvalidColor, hoverInvalidAlpha, {
          emissiveMultiplier: 0.95,
          namePrefix: 'combatMoveHoverInvalid'
        }).material;

    if (!hoverMesh) {
      hoverMesh = createHighlightMesh(runtime, battlefieldView, hoveredCell, { material: desiredMaterial }, {
        name: 'combatMoveHoverPreview',
        yOffset: 0.07,
        scale: 0.78
      });
    } else {
      const world = battlefieldView.gridCellToWorld(hoveredCell);
      hoverMesh.position.x = world.x;
      hoverMesh.position.z = world.z;
    }

    hoverMesh.material = desiredMaterial;
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
      && !combatState.playerMovementInProgress
    );

    if (!shouldShow) {
      clear();
      return;
    }

    const reachableCells = grid.getReachableCells(playerUnit.gridCell, playerUnit.mp, {
      allowOccupiedByUnitId: playerUnit.id,
      movementCost
    }).filter((cell) => !(cell.x === playerUnit.gridCell.x && cell.z === playerUnit.gridCell.z));

    const reachableCellKeySet = new Set(reachableCells.map((cell) => grid.toCellKey(cell)));

    const nextSignature = [
      playerUnit.gridCell.x,
      playerUnit.gridCell.z,
      playerUnit.mp,
      grid.getOccupancyRevision?.() ?? 0,
      createCellSignature(reachableCells)
    ].join('|');

    if (nextSignature !== cacheSignature) {
      cacheSignature = nextSignature;
      disposeHighlights(highlightsByCell);
      ensureOverlayAssets(runtime, overlayState, color, alpha, { namePrefix: 'combatMoveRange' });

      for (const cell of reachableCells) {
        const key = grid.toCellKey(cell);
        const mesh = createHighlightMesh(runtime, battlefieldView, cell, overlayState);
        highlightsByCell.set(key, mesh);
      }
    }

    syncOverlayPulse();
    syncHoverPreview(reachableCellKeySet);
  };

  const layer = battlefieldView.createLayerController(render, clear);
  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(layer.render);
  layer.render();

  return {
    setVisible: layer.setVisible,
    dispose: () => {
      runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      layer.clear();
      overlayState.material?.dispose();
      overlayState.texture?.dispose();

      hoverReachableOverlayState.material?.dispose();
      hoverReachableOverlayState.texture?.dispose();

      hoverInvalidOverlayState.material?.dispose();
      hoverInvalidOverlayState.texture?.dispose();

      pathOverlayState.material?.dispose();
      pathOverlayState.texture?.dispose();
    }
  };
}
