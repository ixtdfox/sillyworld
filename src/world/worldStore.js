import { createGameState } from './worldState.js';
import { deepClone } from './utils/object.js';
import { setTimeOfDay, setTimePhase, advanceTime } from './actions/timeActions.js';
import { addItemToPlayer, moveItemToSlot, removeItemFromPlayer, unequipSlot } from './actions/inventoryActions.js';
import { setRelationship } from './actions/relationshipActions.js';
import { movePlayerToNode } from './actions/navigationActions.js';
import { getAvailableRestActions, performRestAction } from './actions/restActions.js';
import { getMapConfig, getNodesForLevel, getNodeById } from './selectors/mapSelectors.js';
import { canTakeItem, getInventoryWeight } from './selectors/inventorySelectors.js';
import { getRelationship } from './selectors/relationshipSelectors.js';
import { getTimeOfDay, getTimePhase, getWorldClock } from './selectors/worldSelectors.js';
import { getDistrictById, getDistricts, getFactionById, getFactionsForPointOfInterest, getLocationMeta, getPointOfInterestById, getPointsOfInterestForDistrict } from './selectors/settingSelectors.js';
import { getLocationAvailability } from './selectors/locationAvailabilitySelectors.js';
import { getNpcAvailability, getNpcsForLocation } from './selectors/npcAvailabilitySelectors.js';
import { deserializeGameState, saveGameState, loadGameState, serializeGameState } from './worldPersistence.js';
import { consumeNextPhaseTransition, getPendingPhaseTransitions } from './actions/phaseTransitionActions.js';

export function createWorldStore(seed = {}) {
  let state = createGameState(deepClone(seed));
  const listeners = new Set();
  const notify = () => listeners.forEach((cb) => cb(state));

  function apply(nextState) {
    state = nextState;
    notify();
  }

  return {
    getState() {
      return state;
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    reset(nextSeed = seed) {
      apply(createGameState(deepClone(nextSeed)));
    },
    hydrate(json) {
      const nextState = deserializeGameState(json, seed);
      if (!nextState) return false;
      apply(nextState);
      return true;
    },
    setTimeOfDay(nextTimeOfDay) {
      apply(setTimeOfDay(state, nextTimeOfDay));
    },
    setTimePhase(nextTimePhase) {
      apply(setTimePhase(state, nextTimePhase));
    },
    advanceTime() {
      apply(advanceTime(state));
    },

    getAvailableRestActions() {
      return getAvailableRestActions(state);
    },
    performRestAction(actionId) {
      const result = performRestAction(state, actionId);
      if (!result.ok) {
        return {
          ok: false,
          reason: result.reason || ''
        };
      }
      apply(result.state);
      return {
        ok: true,
        timeCostSteps: result.timeCostSteps,
        transitions: result.transitions || []
      };
    },
    movePlayerToNode(nodeId, options = {}) {
      const result = movePlayerToNode(state, nodeId, options);
      if (!result.ok) {
        return {
          ok: false,
          blockedByAvailability: Boolean(result.blockedByAvailability),
          reason: result.reason || ''
        };
      }
      apply(result.state);
      return {
        ok: true,
        timeCostSteps: result.timeCostSteps,
        phaseChanged: result.phaseChanged,
        transitions: result.transitions || []
      };
    },
    consumeNextPhaseTransition() {
      const result = consumeNextPhaseTransition(state);
      if (!result.transition) return null;
      apply(result.state);
      return result.transition;
    },
    getPendingPhaseTransitions() {
      return getPendingPhaseTransitions(state);
    },
    addItemToPlayer(instanceId) {
      const result = addItemToPlayer(state, instanceId);
      if (!result.ok) return false;
      apply(result.state);
      return true;
    },
    removeItemFromPlayer(instanceId) {
      apply(removeItemFromPlayer(state, instanceId));
      return true;
    },
    moveItemToSlot(instanceId, slotId) {
      const result = moveItemToSlot(state, instanceId, slotId);
      if (!result.ok) return false;
      apply(result.state);
      return true;
    },
    unequipSlot(slotId) {
      apply(unequipSlot(state, slotId));
    },
    setRelationship(characterId, delta) {
      const result = setRelationship(state, characterId, delta);
      apply(result.nextState);
      return result.level;
    },
    getRelationship(characterId) {
      return getRelationship(state, characterId);
    },
    getTimePhase() {
      return getTimePhase(state);
    },
    getTimeOfDay() {
      return getTimeOfDay(state);
    },
    getWorldClock() {
      return getWorldClock(state);
    },
    getMapConfig(level) {
      return getMapConfig(state, level);
    },
    getNodeById(nodeId) {
      return getNodeById(state, nodeId);
    },
    getNodesForLevel(level, contextId) {
      return getNodesForLevel(state, level, contextId);
    },
    getInventoryWeight() {
      return getInventoryWeight(state);
    },

    getDistricts() {
      return getDistricts(state);
    },
    getDistrictById(districtId) {
      return getDistrictById(state, districtId);
    },
    getPointOfInterestById(poiId) {
      return getPointOfInterestById(state, poiId);
    },
    getPointsOfInterestForDistrict(districtId) {
      return getPointsOfInterestForDistrict(state, districtId);
    },
    getFactionById(factionId) {
      return getFactionById(state, factionId);
    },
    getFactionsForPointOfInterest(poiId) {
      return getFactionsForPointOfInterest(state, poiId);
    },
    getLocationMeta(args) {
      return getLocationMeta(state, args);
    },
    getLocationAvailability(args) {
      return getLocationAvailability(state, args);
    },
    getNpcAvailability(args) {
      return getNpcAvailability(state, args);
    },
    getNpcsForLocation(locationNodeId, options) {
      return getNpcsForLocation(state, locationNodeId, options);
    },
    canTakeItem(instanceId) {
      return canTakeItem(state, instanceId);
    },
    serialize() {
      return serializeGameState(state);
    },
    save(storage) {
      return saveGameState(storage, state);
    },
    load(storage) {
      const loaded = loadGameState(storage, seed);
      if (!loaded) return false;
      apply(loaded);
      return true;
    }
  };
}

export const worldStore = {
  instance: null,
  init(seed) {
    this.instance = createWorldStore(seed);
    return this.instance;
  },
  get() {
    return this.instance;
  }
};
