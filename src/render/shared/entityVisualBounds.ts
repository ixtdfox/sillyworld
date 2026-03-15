// @ts-nocheck
function isFiniteNumber(value) {
  return Number.isFinite(value);
}

/** Выполняет `cloneVectorLike` в ходе выполнения связанного игрового сценария. */
function cloneVectorLike(source) {
  return {
    x: source.x,
    y: source.y,
    z: source.z
  };
}

/** Определяет `resolveRootNode` в ходе выполнения связанного игрового сценария. */
function resolveRootNode(entityOrRootNode) {
  if (!entityOrRootNode || typeof entityOrRootNode !== 'object') {
    return null;
  }

  if (entityOrRootNode.rootNode && typeof entityOrRootNode.rootNode === 'object') {
    return entityOrRootNode.rootNode;
  }

  return entityOrRootNode;
}

/** Выполняет `refreshEntityWorldMatrices` в ходе выполнения связанного игрового сценария. */
export function refreshEntityWorldMatrices(entityOrRootNode) {
  const rootNode = resolveRootNode(entityOrRootNode);
  if (!rootNode) {
    throw new Error('Cannot refresh world matrices without an entity root node.');
  }

  rootNode.computeWorldMatrix?.(true);

  const descendants = rootNode.getDescendants?.(false) ?? [];
  for (const descendant of descendants) {
    descendant.computeWorldMatrix?.(true);
  }

  const childMeshes = rootNode.getChildMeshes?.(false) ?? [];
  for (const mesh of childMeshes) {
    mesh.computeWorldMatrix?.(true);
    mesh.refreshBoundingInfo?.(true);
  }

  return rootNode;
}

/** Выполняет `readEntityBoundingBox` в ходе выполнения связанного игрового сценария. */
export function readEntityBoundingBox(entityOrRootNode) {
  const rootNode = refreshEntityWorldMatrices(entityOrRootNode);
  const bounds = rootNode.getHierarchyBoundingVectors?.(true);
  const min = bounds?.min;
  const max = bounds?.max;

  if (!min || !max || !isFiniteNumber(min.y) || !isFiniteNumber(max.y)) {
    return null;
  }

  return Object.freeze({
    min: Object.freeze(cloneVectorLike(min)),
    max: Object.freeze(cloneVectorLike(max))
  });
}

/** Возвращает `getEntityVisualHeight` в ходе выполнения связанного игрового сценария. */
export function getEntityVisualHeight(entityOrRootNode) {
  const bounds = readEntityBoundingBox(entityOrRootNode);
  if (!bounds) return NaN;

  return bounds.max.y - bounds.min.y;
}

/** Возвращает `getEntityBottomY` в ходе выполнения связанного игрового сценария. */
export function getEntityBottomY(entityOrRootNode) {
  const bounds = readEntityBoundingBox(entityOrRootNode);
  return bounds ? bounds.min.y : NaN;
}

/** Выполняет `placeEntityOnGround` в ходе выполнения связанного игрового сценария. */
export function placeEntityOnGround(entityOrRootNode, options = {}) {
  const rootNode = refreshEntityWorldMatrices(entityOrRootNode);
  const currentBottomY = getEntityBottomY(rootNode);

  if (!isFiniteNumber(currentBottomY)) {
    const debugLabel = options.debugLabel ? ` for ${options.debugLabel}` : '';
    throw new Error(
      `Cannot place entity on ground${debugLabel}: measured bottom Y must be a finite number (received ${String(currentBottomY)}).`
    );
  }

  const groundY = isFiniteNumber(options.groundY) ? options.groundY : 0;
  const groundOffset = isFiniteNumber(options.groundOffset) ? options.groundOffset : 0;
  const targetBottomY = groundY + groundOffset;
  const deltaY = targetBottomY - currentBottomY;

  if (!rootNode.position || typeof rootNode.position !== 'object') {
    rootNode.position = { y: 0 };
  }

  const currentPositionY = isFiniteNumber(rootNode.position.y) ? rootNode.position.y : 0;
  rootNode.position.y = currentPositionY + deltaY;

  refreshEntityWorldMatrices(rootNode);
  return rootNode.position.y;
}

/** Константа `alignEntityToGround` хранит общие настройки/данные, которые переиспользуются в модуле `render/shared/entityVisualBounds`. */
export const alignEntityToGround = placeEntityOnGround;
