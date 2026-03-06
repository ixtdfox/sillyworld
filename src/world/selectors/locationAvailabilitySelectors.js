import { TIME_PHASE } from '../constants/types.js';
import { getDistrictById, getPointOfInterestById } from './settingSelectors.js';
import { getTimePhase } from './worldSelectors.js';

const ALL_PHASES = new Set(Object.values(TIME_PHASE));

function normalizePhases(phases = []) {
  return phases.filter((phase) => ALL_PHASES.has(phase));
}

export function evaluateLocationAvailability(meta = {}, timePhase) {
  const availability = meta?.availability || {};
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

export function getLocationAvailability(state, { districtId = null, poiId = null } = {}) {
  const timePhase = getTimePhase(state);
  const districtMeta = districtId ? getDistrictById(state, districtId)?.meta : null;
  const poiMeta = poiId ? getPointOfInterestById(state, poiId)?.meta : null;

  const district = districtMeta ? evaluateLocationAvailability(districtMeta, timePhase) : null;
  const pointOfInterest = poiMeta ? evaluateLocationAvailability(poiMeta, timePhase) : null;

  const available = [district, pointOfInterest].filter(Boolean).every((entry) => entry.available);
  const preferred = [district, pointOfInterest].filter(Boolean).some((entry) => entry.preferred);
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
