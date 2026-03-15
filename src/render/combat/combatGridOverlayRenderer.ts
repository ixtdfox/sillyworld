// @ts-nocheck
/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
import { createCombatBattlefieldVisualization } from './combatBattlefieldVisualization.ts';

/** Собирает `buildGridLines` в ходе выполнения связанного игрового сценария. */
function buildGridLines(runtime, battlefieldView, bounds) {
  const lines = [];
  const minCorner = battlefieldView.gridCellToWorld({ x: bounds.minX, z: bounds.minZ }, { anchor: 'corner' });
  const maxCorner = battlefieldView.gridCellToWorld({ x: bounds.maxX + 1, z: bounds.maxZ + 1 }, { anchor: 'corner' });

  for (let x = bounds.minX; x <= bounds.maxX + 1; x += 1) {
    const start = battlefieldView.gridCellToWorld({ x, z: bounds.minZ }, { anchor: 'corner' });
    const end = battlefieldView.gridCellToWorld({ x, z: bounds.maxZ + 1 }, { anchor: 'corner' });

    lines.push([
      new runtime.BABYLON.Vector3(start.x, start.y, minCorner.z),
      new runtime.BABYLON.Vector3(end.x, end.y, maxCorner.z)
    ]);
  }

  for (let z = bounds.minZ; z <= bounds.maxZ + 1; z += 1) {
    const start = battlefieldView.gridCellToWorld({ x: bounds.minX, z }, { anchor: 'corner' });
    const end = battlefieldView.gridCellToWorld({ x: bounds.maxX + 1, z }, { anchor: 'corner' });

    lines.push([
      new runtime.BABYLON.Vector3(minCorner.x, start.y, start.z),
      new runtime.BABYLON.Vector3(maxCorner.x, end.y, end.z)
    ]);
  }

  return lines;
}

/** Создаёт и настраивает `createCombatGridOverlayRenderer` в ходе выполнения связанного игрового сценария. */
export function createCombatGridOverlayRenderer(runtime, options = {}) {
  const {
    combatState,
    color = '#46d7ff',
    lineAlpha = 0.9,
    resolveY = () => 0
  } = options;

  const battlefieldView = createCombatBattlefieldVisualization(runtime, {
    combatState,
    resolveY
  });

  let gridMesh = null;
  let signature = '';

  const clear = () => {
    signature = '';
    gridMesh?.dispose(false, true);
    gridMesh = null;
  };

  const render = () => {
    if (!layer.shouldRender()) {
      if (gridMesh) {
        gridMesh.setEnabled(false);
      }
      return;
    }

    const bounds = battlefieldView.getGridBounds();
    if (!bounds) {
      return;
    }

    const nextSignature = battlefieldView.createGridSignature();
    if (nextSignature === signature) {
      gridMesh?.setEnabled(true);
      return;
    }

    signature = nextSignature;
    gridMesh?.dispose(false, true);

    const lines = buildGridLines(runtime, battlefieldView, bounds);
    gridMesh = runtime.BABYLON.MeshBuilder.CreateLineSystem('combatGridOverlay', {
      lines,
      updatable: true
    }, runtime.scene);

    gridMesh.color = runtime.BABYLON.Color3.FromHexString(color);
    gridMesh.alpha = lineAlpha;
    battlefieldView.attachToBattlefieldLayer(gridMesh, 0.03);

    if (gridMesh.material) {
      gridMesh.material.alpha = lineAlpha;
      gridMesh.material.wireframe = false;
    }

    gridMesh.setEnabled(true);
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
