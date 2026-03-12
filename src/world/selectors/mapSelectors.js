function getMapConfig(state, level) {
  return state.maps.levelConfigs[level] || null;
}
function getNodeById(state, nodeId) {
  return state.maps.nodesById[nodeId] || null;
}
function getNodesForLevel(state, level, contextId = null) {
  return Object.values(state.maps.nodesById).filter((node) => node.level === level && (!contextId || node.parentId === contextId));
}
export {
  getMapConfig,
  getNodeById,
  getNodesForLevel
};
