/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — навигация по карте и переходы между контекстами локаций.
 */
import type { GameState, MapLevel, MapLevelConfigState, MapNodeState } from '../contracts.ts';

/** Возвращает `getMapConfig` в ходе выполнения связанного игрового сценария. */
export function getMapConfig(state: GameState, level: MapLevel): MapLevelConfigState | null {
  return state.maps.levelConfigs[level] || null;
}

/** Возвращает `getNodeById` в ходе выполнения связанного игрового сценария. */
export function getNodeById(state: GameState, nodeId: string): MapNodeState | null {
  return state.maps.nodesById[nodeId] || null;
}

/** Возвращает `getNodesForLevel` в ходе выполнения связанного игрового сценария. */
export function getNodesForLevel(state: GameState, level: MapLevel, contextId: string | null = null): MapNodeState[] {
  return Object.values(state.maps.nodesById).filter((node) => node.level === level && (!contextId || node.parentId === contextId));
}
