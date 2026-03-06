import { advanceTimeBySteps, getTimeCostForAction } from './timeActions.js';

const NAVIGABLE_LEVELS = new Set(['district', 'building', 'room']);

export function movePlayerToNode(state, targetNodeId, options = {}) {
  const targetNode = state.maps?.nodesById?.[targetNodeId] || null;
  if (!targetNode || !NAVIGABLE_LEVELS.has(targetNode.level)) {
    return { ok: false, state };
  }

  const previousPhase = state.world?.timePhase;
  const actionType = options.actionType || 'navigation';
  const defaultCost = getTimeCostForAction(actionType, getTimeCostForAction('navigation', 1));
  const timeCostSteps = Number.isFinite(options.timeCostSteps)
    ? Math.max(0, Math.floor(options.timeCostSteps))
    : defaultCost;

  const movedState = {
    ...state,
    player: {
      ...state.player,
      currentNodeId: targetNode.id
    },
    updatedAt: Date.now()
  };

  const nextState = advanceTimeBySteps(movedState, timeCostSteps);

  return {
    ok: true,
    state: nextState,
    timeCostSteps,
    phaseChanged: previousPhase !== nextState.world.timePhase
  };
}
