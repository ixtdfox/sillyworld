// @ts-nocheck
function createLayerController(render, clear) {
  let layerVisible = true;

  return {
    shouldRender: () => layerVisible,
    setVisible: (visible) => {
      layerVisible = visible !== false;
      if (!layerVisible) {
        clear?.();
      }
      return layerVisible;
    },
    render,
    clear
  };
}

export function createCombatBattlefieldVisualization(runtime, options = {}) {
  const {
    combatState,
    resolveY = () => 0,
    renderingGroupId = 1
  } = options;

  const getGridMapper = () => combatState.gridMapper;
  const getGridBounds = () => combatState.grid?.bounds;

  const gridCellToWorld = (cell, transform = {}) => {
    const mapper = getGridMapper();
    if (!mapper) {
      return null;
    }

    return mapper.gridCellToWorld(cell, {
      ...transform,
      resolveY: ({ x, z }) => resolveY({ x, z })
    });
  };

  const attachToBattlefieldLayer = (mesh, yOffset = 0) => {
    if (!mesh) {
      return mesh;
    }

    mesh.position.y += yOffset;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = renderingGroupId;
    mesh.parent = combatState.combatScene?.sceneContainer ?? null;

    return mesh;
  };

  const createGridSignature = () => {
    const mapper = getGridMapper();
    const bounds = getGridBounds();

    if (!mapper || !bounds) {
      return '';
    }

    return [
      bounds.minX,
      bounds.maxX,
      bounds.minZ,
      bounds.maxZ,
      mapper.cellSize,
      mapper.originWorldX ?? 0,
      mapper.originWorldZ ?? 0
    ].join('|');
  };

  return {
    createLayerController,
    getGridMapper,
    getGridBounds,
    createGridSignature,
    gridCellToWorld,
    attachToBattlefieldLayer
  };
}
