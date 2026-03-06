export function getMapConfig(state, level) {
  return state.maps.levelConfigs[level] || null;
}

export function getNodeById(state, nodeId) {
  return state.maps.nodesById[nodeId] || null;
}

export function getNodesForLevel(state, level, contextId = null) {
  return Object.values(state.maps.nodesById).filter((node) => node.level === level && (!contextId || node.parentId === contextId));
}
