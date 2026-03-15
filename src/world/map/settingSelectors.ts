/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — навигация по карте и переходы между контекстами локаций.
 */
import type {
  DistrictState,
  FactionState,
  GameState,
  LocationMetaState,
  PointOfInterestState
} from '../contracts.ts';

/** Возвращает `getDistricts` в ходе выполнения связанного игрового сценария. */
export function getDistricts(state: GameState): DistrictState[] {
  return Object.values(state.setting?.districtsById || {});
}

/** Возвращает `getDistrictById` в ходе выполнения связанного игрового сценария. */
export function getDistrictById(state: GameState, districtId: string): DistrictState | null {
  return state.setting?.districtsById?.[districtId] || null;
}

/** Возвращает `getPointsOfInterest` в ходе выполнения связанного игрового сценария. */
export function getPointsOfInterest(state: GameState): PointOfInterestState[] {
  return Object.values(state.setting?.pointsOfInterestById || {});
}

/** Возвращает `getPointOfInterestById` в ходе выполнения связанного игрового сценария. */
export function getPointOfInterestById(state: GameState, poiId: string): PointOfInterestState | null {
  return state.setting?.pointsOfInterestById?.[poiId] || null;
}

/** Возвращает `getPointsOfInterestForDistrict` в ходе выполнения связанного игрового сценария. */
export function getPointsOfInterestForDistrict(state: GameState, districtId: string): PointOfInterestState[] {
  return getPointsOfInterest(state).filter((poi) => poi.districtId === districtId);
}

/** Возвращает `getFactions` в ходе выполнения связанного игрового сценария. */
export function getFactions(state: GameState): FactionState[] {
  return Object.values(state.setting?.factionsById || {});
}

/** Возвращает `getFactionById` в ходе выполнения связанного игрового сценария. */
export function getFactionById(state: GameState, factionId: string): FactionState | null {
  return state.setting?.factionsById?.[factionId] || null;
}

/** Возвращает `getFactionsForPointOfInterest` в ходе выполнения связанного игрового сценария. */
export function getFactionsForPointOfInterest(state: GameState, poiId: string): FactionState[] {
  const poi = getPointOfInterestById(state, poiId);
  if (!poi) return [];
  return (poi.factionIds || [])
    .map((factionId) => getFactionById(state, factionId))
    .filter((faction): faction is FactionState => Boolean(faction));
}

/** Возвращает `getLocationMeta` в ходе выполнения связанного игрового сценария. */
export function getLocationMeta(
  state: GameState,
  { districtId = null, poiId = null }: { districtId?: string | null; poiId?: string | null } = {}
): LocationMetaState | null {
  if (poiId) {
    const poi = getPointOfInterestById(state, poiId);
    return poi?.meta || null;
  }
  if (districtId) {
    const district = getDistrictById(state, districtId);
    return district?.meta || null;
  }
  return null;
}
