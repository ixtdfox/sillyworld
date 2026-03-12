import { TIME_PHASE } from "../constants/types.js";
import { getTimePhase } from "./worldSelectors.js";
const ALL_PHASES = new Set(Object.values(TIME_PHASE));
function normalizePhaseRules(rules = {}) {
  return Object.fromEntries(
    Object.entries(rules).filter(([phase]) => ALL_PHASES.has(phase)).map(([phase, value]) => {
      if (typeof value === "boolean") {
        return [phase, { available: value }];
      }
      if (!value || typeof value !== "object") {
        return [phase, { available: true }];
      }
      return [
        phase,
        {
          available: value.available !== false,
          reason: value.reason || "",
          locationId: value.locationId || value.atLocationId || null
        }
      ];
    })
  );
}
function evaluateNpcAvailability(meta = {}, timePhase, locationNodeId = null) {
  const schedule = meta?.availability || {};
  const byPhase = normalizePhaseRules(schedule.byPhase);
  const phaseRule = byPhase[timePhase] || { available: true };
  let available = phaseRule.available !== false;
  let reason = phaseRule.reason || "";
  const requiredLocationId = phaseRule.locationId || null;
  if (available && requiredLocationId && locationNodeId && requiredLocationId !== locationNodeId) {
    available = false;
    reason ||= `Usually found at ${requiredLocationId.replace(/^building:/, "").replace(/-/g, " ")} during this phase.`;
  }
  if (!available && !reason) {
    reason = `Unavailable during ${timePhase}.`;
  }
  return {
    available,
    reason,
    requiredLocationId,
    timePhase
  };
}
function getNpcAvailability(state, { npcNodeId = null, npcNode = null, locationNodeId = null } = {}) {
  const node = npcNode || (npcNodeId ? state.maps?.nodesById?.[npcNodeId] : null);
  if (!node || node.type !== "npc") {
    return {
      available: false,
      reason: "Unknown contact.",
      requiredLocationId: null,
      timePhase: getTimePhase(state)
    };
  }
  const effectiveLocationNodeId = locationNodeId || node.parentId || null;
  return evaluateNpcAvailability(node.meta || {}, getTimePhase(state), effectiveLocationNodeId);
}
function getNpcsForLocation(state, locationNodeId, { onlyAvailable = false } = {}) {
  const candidates = Object.values(state.maps?.nodesById || {}).filter((node) => node.type === "npc" && node.parentId === locationNodeId);
  if (!onlyAvailable) return candidates;
  return candidates.filter((node) => getNpcAvailability(state, { npcNode: node, locationNodeId }).available);
}
export {
  evaluateNpcAvailability,
  getNpcAvailability,
  getNpcsForLocation
};
