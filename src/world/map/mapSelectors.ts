import type { GameState, MapLevel, MapLevelConfigState, MapNodeState } from '../contracts.ts';

export function getMapConfig(state: GameState, level: MapLevel): MapLevelConfigState | null {
  return state.maps.levelConfigs[level] || null;
}

export function getNodeById(state: GameState, nodeId: string): MapNodeState | null {
  return state.maps.nodesById[nodeId] || null;
}

export function getNodesForLevel(state: GameState, level: MapLevel, contextId: string | null = null): MapNodeState[] {
  return Object.values(state.maps.nodesById).filter((node) => node.level === level && (!contextId || node.parentId === contextId));
}
