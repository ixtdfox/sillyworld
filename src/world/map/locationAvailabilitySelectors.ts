/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — навигация по карте и переходы между контекстами локаций.
 */
import { TIME_PHASE } from '../constant/types.ts';
import type { GameState, LocationMetaState, TimePhase } from '../contracts.ts';
import { getDistrictById, getPointOfInterestById } from './settingSelectors.ts';
import { getTimePhase } from '../time/worldSelectors.ts';

const ALL_PHASES = new Set<TimePhase>(Object.values(TIME_PHASE));

/** Нормализует `normalizePhases` в ходе выполнения связанного игрового сценария. */
function normalizePhases(phases: TimePhase[] = []): TimePhase[] {
  return phases.filter((phase): phase is TimePhase => ALL_PHASES.has(phase));
}

/** Определяет контракт `LocationAvailabilityResult` для согласованного взаимодействия модулей в контексте `world/map/locationAvailabilitySelectors`. */
export interface LocationAvailabilityResult {
  available: boolean;
  preferred: boolean;
  mode: string;
  reason: string;
  allowedPhases: TimePhase[];
  preferredPhases: TimePhase[];
}

/** Определяет контракт `CombinedLocationAvailability` для согласованного взаимодействия модулей в контексте `world/map/locationAvailabilitySelectors`. */
export interface CombinedLocationAvailability {
  timePhase: TimePhase;
  available: boolean;
  preferred: boolean;
  reason: string;
  district: LocationAvailabilityResult | null;
  pointOfInterest: LocationAvailabilityResult | null;
}

/** Выполняет `evaluateLocationAvailability` в ходе выполнения связанного игрового сценария. */
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

/** Возвращает `getLocationAvailability` в ходе выполнения связанного игрового сценария. */
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
