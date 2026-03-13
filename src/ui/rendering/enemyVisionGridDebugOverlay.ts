// @ts-nocheck
import { createCombatGridMapper } from './combatGridMapper.ts';
import { getEnemyVisionCoverage } from './enemyPerception.ts';

function keyForCell(cell) {
  return `${cell.x},${cell.z}`;
}

function createCellMaterial(runtime, color, alpha, name) {
  const material = new runtime.BABYLON.StandardMaterial(name, runtime.scene);
  material.diffuseColor = runtime.BABYLON.Color3.Black();
  material.specularColor = runtime.BABYLON.Color3.Black();
  material.emissiveColor = runtime.BABYLON.Color3.FromHexString(color);
  material.alpha = alpha;
  material.backFaceCulling = false;
  material.disableLighting = true;
  return material;
}

function createCellMesh(runtime, mapper, cell, y, name) {
  const world = mapper.gridCellToWorld(cell, { fallbackY: y });
  const mesh = runtime.BABYLON.MeshBuilder.CreateGround(name, {
    width: mapper.cellSize * 0.92,
    height: mapper.cellSize * 0.92,
    subdivisions: 1
  }, runtime.scene);

  mesh.position.x = world.x;
  mesh.position.y = world.y + 0.045;
  mesh.position.z = world.z;
  mesh.isPickable = false;
  mesh.metadata = {
    ...(mesh.metadata ?? {}),
    isEnemyVisionDebugOverlay: true
  };
  return mesh;
}

export function createEnemyVisionGridDebugOverlay(runtime, options = {}) {
  const {
    getEnemyActor,
    getPlayerActor,
    hasLineOfSight,
    isVisible = () => true,
    resolveY = () => 0,
    visibleCellColor = '#49b8ff',
    blockedCellColor = '#ff9f43',
    playerDetectedCellColor = '#ff4565'
  } = options;

  const mapper = createCombatGridMapper();
  const visibleMeshes = new Map();
  const blockedMeshes = new Map();
  let playerDetectedMesh = null;
  let playerDetectedCellKey = null;
  let observer = null;
  let enabled = true;

  const visibleMaterial = createCellMaterial(runtime, visibleCellColor, 0.4, 'enemyVisionVisibleMaterial');
  const blockedMaterial = createCellMaterial(runtime, blockedCellColor, 0.5, 'enemyVisionBlockedMaterial');
  const playerDetectedMaterial = createCellMaterial(runtime, playerDetectedCellColor, 0.75, 'enemyVisionPlayerMaterial');

  const clearMeshes = () => {
    for (const mesh of visibleMeshes.values()) {
      mesh.dispose(false, true);
    }
    for (const mesh of blockedMeshes.values()) {
      mesh.dispose(false, true);
    }
    visibleMeshes.clear();
    blockedMeshes.clear();
    playerDetectedMesh?.dispose(false, true);
    playerDetectedMesh = null;
    playerDetectedCellKey = null;
  };

  const syncMeshSet = (targetMap, cells, material, prefix, y) => {
    const nextKeys = new Set(cells.map(keyForCell));

    for (const [cellKey, mesh] of targetMap.entries()) {
      if (nextKeys.has(cellKey)) {
        mesh.setEnabled(enabled && isVisible());
        continue;
      }
      mesh.dispose(false, true);
      targetMap.delete(cellKey);
    }

    for (const cell of cells) {
      const cellKey = keyForCell(cell);
      if (targetMap.has(cellKey)) {
        continue;
      }

      const mesh = createCellMesh(runtime, mapper, cell, y, `${prefix}_${cell.x}_${cell.z}`);
      mesh.material = material;
      mesh.setEnabled(enabled && isVisible());
      targetMap.set(cellKey, mesh);
    }
  };

  const tick = () => {
    const shouldShow = enabled && isVisible();
    const enemyActor = getEnemyActor?.();
    if (!enemyActor?.rootNode?.position || !shouldShow) {
      for (const mesh of visibleMeshes.values()) mesh.setEnabled(false);
      for (const mesh of blockedMeshes.values()) mesh.setEnabled(false);
      playerDetectedMesh?.setEnabled(false);
      return;
    }

    const enemyY = resolveY(enemyActor.rootNode.position);
    const coverage = getEnemyVisionCoverage(enemyActor, mapper, {
      hasLineOfSight
    });

    syncMeshSet(visibleMeshes, coverage.visibleCells, visibleMaterial, 'enemyVisionVisible', enemyY);
    syncMeshSet(blockedMeshes, coverage.blockedCells, blockedMaterial, 'enemyVisionBlocked', enemyY);

    const playerActor = getPlayerActor?.();
    const playerCell = playerActor?.rootNode?.position ? mapper.worldToGridCell(playerActor.rootNode.position) : null;
    const playerDetected = playerCell && coverage.visibleCells.some((cell) => cell.x === playerCell.x && cell.z === playerCell.z);

    if (playerDetected && playerCell) {
      const nextPlayerCellKey = keyForCell(playerCell);
      if (!playerDetectedMesh || playerDetectedCellKey !== nextPlayerCellKey) {
        playerDetectedMesh?.dispose(false, true);
        playerDetectedMesh = createCellMesh(runtime, mapper, playerCell, enemyY, `enemyVisionPlayer_${playerCell.x}_${playerCell.z}`);
        playerDetectedMesh.material = playerDetectedMaterial;
        playerDetectedCellKey = nextPlayerCellKey;
      }
      playerDetectedMesh.setEnabled(shouldShow);
    } else if (playerDetectedMesh) {
      playerDetectedMesh.setEnabled(false);
      playerDetectedCellKey = null;
    }
  };

  observer = runtime.scene.onBeforeRenderObservable.add(tick);

  return {
    setVisible: (visible) => {
      enabled = visible !== false;
    },
    dispose: () => {
      if (observer) {
        runtime.scene.onBeforeRenderObservable.remove(observer);
        observer = null;
      }
      clearMeshes();
      visibleMaterial.dispose(false, true);
      blockedMaterial.dispose(false, true);
      playerDetectedMaterial.dispose(false, true);
    }
  };
}
