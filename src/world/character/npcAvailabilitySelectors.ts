import { TIME_PHASE } from '../constant/types.ts';
import type { GameState, MapNodeState, TimePhase } from '../contracts.ts';
import { getTimePhase } from '../time/worldSelectors.ts';

const ALL_PHASES = new Set<TimePhase>(Object.values(TIME_PHASE));

function isTimePhase(value: string): value is TimePhase {
  return ALL_PHASES.has(value as TimePhase);
}

interface NpcPhaseRule {
  available: boolean;
  reason?: string;
  locationId?: string | null;
}

type NpcPhaseRules = Partial<Record<TimePhase, NpcPhaseRule>>;

interface NpcAvailabilityMeta {
  availability?: {
    byPhase?: Record<string, boolean | NpcPhaseRule>;
  };
}

export interface NpcAvailabilityResult {
  available: boolean;
  reason: string;
  requiredLocationId: string | null;
  timePhase: TimePhase;
}

function normalizePhaseRules(rules: Record<string, boolean | NpcPhaseRule> = {}): NpcPhaseRules {
  return Object.fromEntries(
    Object.entries(rules)
      .filter(([phase]) => isTimePhase(phase))
      .map(([phase, value]) => {
        if (typeof value === 'boolean') {
          return [phase, { available: value }];
        }

        if (!value || typeof value !== 'object') {
          return [phase, { available: true }];
        }

        return [
          phase,
          {
            available: value.available !== false,
            reason: value.reason || '',
            locationId: value.locationId || ('atLocationId' in value ? value.atLocationId : null) || null
          }
        ];
      })
  );
}

export function evaluateNpcAvailability(
  meta: NpcAvailabilityMeta = {},
  timePhase: TimePhase,
  locationNodeId: string | null = null
): NpcAvailabilityResult {
  const schedule = meta?.availability || {};
  const byPhase = normalizePhaseRules(schedule.byPhase);
  const phaseRule = byPhase[timePhase] || { available: true };

  let available = phaseRule.available !== false;
  let reason = phaseRule.reason || '';
  const requiredLocationId = phaseRule.locationId || null;

  if (available && requiredLocationId && locationNodeId && requiredLocationId !== locationNodeId) {
    available = false;
    reason ||= `Usually found at ${requiredLocationId.replace(/^building:/, '').replace(/-/g, ' ')} during this phase.`;
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

export function getNpcAvailability(
  state: GameState,
  { npcNodeId = null, npcNode = null, locationNodeId = null }: { npcNodeId?: string | null; npcNode?: MapNodeState | null; locationNodeId?: string | null } = {}
): NpcAvailabilityResult {
  const node = npcNode || (npcNodeId ? state.maps?.nodesById?.[npcNodeId] : null);
  if (!node || node.type !== 'npc') {
    return {
      available: false,
      reason: 'Unknown contact.',
      requiredLocationId: null,
      timePhase: getTimePhase(state)
    };
  }

  const effectiveLocationNodeId = locationNodeId || node.parentId || null;
  return evaluateNpcAvailability(node.meta || {}, getTimePhase(state), effectiveLocationNodeId);
}

export function getNpcsForLocation(
  state: GameState,
  locationNodeId: string,
  { onlyAvailable = false }: { onlyAvailable?: boolean } = {}
): MapNodeState[] {
  const candidates = Object.values(state.maps?.nodesById || {}).filter((node) => node.type === 'npc' && node.parentId === locationNodeId);

  if (!onlyAvailable) return candidates;

  return candidates.filter((node) => getNpcAvailability(state, { npcNode: node, locationNodeId }).available);
}
