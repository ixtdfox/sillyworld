import { advanceTimeBySteps, getTimeCostForAction } from '../time/timeActions.ts';
import { getLocationAvailability } from './locationAvailabilitySelectors.ts';
import type { GameState, MapLevel, PhaseTransitionRecord } from '../contracts.ts';

const NAVIGABLE_LEVELS = new Set<MapLevel>(['district', 'building', 'room']);

/** Выполняет `asPoiId` в ходе выполнения связанного игрового сценария. */
function asPoiId(nodeId = ''): string {
  return `poi:${nodeId.split(':')[1] || nodeId}`;
}

/** Определяет контракт `MoveOptions` для согласованного взаимодействия модулей в контексте `world/map/navigationActions`. */
interface MoveOptions {
  actionType?: string;
  timeCostSteps?: number;
}

/** Определяет контракт `MovePlayerResult` для согласованного взаимодействия модулей в контексте `world/map/navigationActions`. */
interface MovePlayerResult {
  ok: boolean;
  state: GameState;
  blockedByAvailability?: boolean;
  reason?: string;
  timeCostSteps?: number;
  phaseChanged?: boolean;
  transitions?: PhaseTransitionRecord[];
}

/** Выполняет `movePlayerToNode` в ходе выполнения связанного игрового сценария. */
export function movePlayerToNode(state: GameState, targetNodeId: string, options: MoveOptions = {}): MovePlayerResult {
  const targetNode = state.maps?.nodesById?.[targetNodeId] || null;
  if (!targetNode || !NAVIGABLE_LEVELS.has(targetNode.level)) {
    return { ok: false, state };
  }

  if (targetNode.level === 'district' || targetNode.level === 'building') {
    const availabilityArgs = {
      ...(targetNode.level === 'district' ? { districtId: targetNode.id } : {}),
      ...(targetNode.level === 'building' ? { districtId: targetNode.parentId ?? null, poiId: asPoiId(targetNode.id) } : {})
    };
    const availability = getLocationAvailability(state, availabilityArgs);

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
  const previousPendingTransitions = Array.isArray(state.world.phaseTransitions?.pending)
    ? state.world.phaseTransitions.pending.length
    : 0;
  const actionType = options.actionType || 'navigation';
  const defaultCost = getTimeCostForAction(actionType, getTimeCostForAction('navigation', 1));
  const timeCostSteps = Number.isFinite(options.timeCostSteps)
    ? Math.max(0, Math.floor(options.timeCostSteps || 0))
    : defaultCost;

  const movedState: GameState = {
    ...state,
    player: {
      ...state.player,
      currentNodeId: targetNode.id
    },
    updatedAt: Date.now()
  };

  const nextState = advanceTimeBySteps(movedState, timeCostSteps);
  const transitions = Array.isArray(nextState.world.phaseTransitions?.pending)
    ? nextState.world.phaseTransitions.pending.slice(previousPendingTransitions)
    : [];

  return {
    ok: true,
    state: nextState,
    timeCostSteps,
    phaseChanged: previousPhase !== nextState.world.timePhase,
    transitions
  };
}
