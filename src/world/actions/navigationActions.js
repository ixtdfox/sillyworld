import { advanceTimeBySteps, getTimeCostForAction } from "./timeActions.js";
import { getLocationAvailability } from "../selectors/locationAvailabilitySelectors.js";
const NAVIGABLE_LEVELS = /* @__PURE__ */ new Set(["district", "building", "room"]);
function asPoiId(nodeId = "") {
  return `poi:${nodeId.split(":")[1] || nodeId}`;
}
function movePlayerToNode(state, targetNodeId, options = {}) {
  const targetNode = state.maps?.nodesById?.[targetNodeId] || null;
  if (!targetNode || !NAVIGABLE_LEVELS.has(targetNode.level)) {
    return { ok: false, state };
  }
  if (targetNode.level === "district" || targetNode.level === "building") {
    const availability = getLocationAvailability(state, {
      districtId: targetNode.level === "district" ? targetNode.id : targetNode.parentId,
      poiId: targetNode.level === "building" ? asPoiId(targetNode.id) : null
    });
    if (!availability.available) {
      return {
        ok: false,
        blockedByAvailability: true,
        reason: availability.reason,
        state
      };
    }
  }
  const previousPhase = state.world.timePhase;
  const previousPendingTransitions = Array.isArray(state.world.phaseTransitions?.pending) ? state.world.phaseTransitions.pending.length : 0;
  const actionType = options.actionType || "navigation";
  const defaultCost = getTimeCostForAction(actionType, getTimeCostForAction("navigation", 1));
  const timeCostSteps = Number.isFinite(options.timeCostSteps) ? Math.max(0, Math.floor(options.timeCostSteps || 0)) : defaultCost;
  const movedState = {
    ...state,
    player: {
      ...state.player,
      currentNodeId: targetNode.id
    },
    updatedAt: Date.now()
  };
  const nextState = advanceTimeBySteps(movedState, timeCostSteps);
  const transitions = Array.isArray(nextState.world.phaseTransitions?.pending) ? nextState.world.phaseTransitions.pending.slice(previousPendingTransitions) : [];
  return {
    ok: true,
    state: nextState,
    timeCostSteps,
    phaseChanged: previousPhase !== nextState.world.timePhase,
    transitions
  };
}
export {
  movePlayerToNode
};
