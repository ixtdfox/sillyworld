import { TIME_PHASE } from '../constants/types.ts';
import type { GameState, LocationMetaState, TimePhase } from '../contracts.ts';
import { getDistrictById, getPointOfInterestById } from './settingSelectors.ts';
import { getTimePhase } from './worldSelectors.ts';

const ALL_PHASES = new Set<TimePhase>(Object.values(TIME_PHASE));

function normalizePhases(phases: TimePhase[] = []): TimePhase[] {
  return phases.filter((phase): phase is TimePhase => ALL_PHASES.has(phase));
}

export interface LocationAvailabilityResult {
  available: boolean;
  preferred: boolean;
  mode: string;
  reason: string;
  allowedPhases: TimePhase[];
  preferredPhases: TimePhase[];
}

export interface CombinedLocationAvailability {
  timePhase: TimePhase;
  available: boolean;
  preferred: boolean;
  reason: string;
  district: LocationAvailabilityResult | null;
  pointOfInterest: LocationAvailabilityResult | null;
}

export function evaluateLocationAvailability(meta: LocationMetaState, timePhase: TimePhase): LocationAvailabilityResult {
  const availability = meta.availability;
  const mode = availability.mode || 'always';
  const allowedPhases = normalizePhases(availability.allowedPhases || []);
  const preferredPhases = normalizePhases(availability.preferredPhases || []);

  let available = true;
  let reason = availability.unavailableReason || '';

  switch (mode) {
    case 'phase-list':
      available = allowedPhases.length === 0 || allowedPhases.includes(timePhase);
      if (!available) reason ||= `Available only during ${allowedPhases.join(', ')}.`;
      break;
    case 'not-night':
      available = timePhase !== TIME_PHASE.Night;
      if (!available) reason ||= 'Unavailable at night.';
      break;
    case 'night-only':
      available = timePhase === TIME_PHASE.Night;
      if (!available) reason ||= 'Available only at night.';
      break;
    case 'restricted':
      available = false;
      if (!reason) {
        reason = availability.restrictedProfile === 'old-city-epic-lock'
          ? 'Old City access unlocks in a later chapter.'
          : 'Currently restricted.';
      }
      break;
    case 'always':
    default:
      available = true;
      break;
  }

  return {
    available,
    preferred: preferredPhases.includes(timePhase),
    mode,
    reason,
    allowedPhases,
    preferredPhases
  };
}

export function getLocationAvailability(
  state: GameState,
  { districtId = null, poiId = null }: { districtId?: string | null; poiId?: string | null } = {}
): CombinedLocationAvailability {
  const timePhase = getTimePhase(state);
  const districtMeta = districtId ? getDistrictById(state, districtId)?.meta : null;
  const poiMeta = poiId ? getPointOfInterestById(state, poiId)?.meta : null;

  const district = districtMeta ? evaluateLocationAvailability(districtMeta, timePhase) : null;
  const pointOfInterest = poiMeta ? evaluateLocationAvailability(poiMeta, timePhase) : null;

  const entries = [district, pointOfInterest].filter((entry): entry is LocationAvailabilityResult => Boolean(entry));
  const available = entries.every((entry) => entry.available);
  const preferred = entries.some((entry) => entry.preferred);
  const reason = [pointOfInterest, district].find((entry) => entry && !entry.available)?.reason || '';

  return {
    timePhase,
    available,
    preferred,
    reason,
    district,
    pointOfInterest
  };
}
