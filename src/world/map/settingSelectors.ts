import type {
  DistrictState,
  FactionState,
  GameState,
  LocationMetaState,
  PointOfInterestState
} from '../contracts.ts';

export function getDistricts(state: GameState): DistrictState[] {
  return Object.values(state.setting?.districtsById || {});
}

export function getDistrictById(state: GameState, districtId: string): DistrictState | null {
  return state.setting?.districtsById?.[districtId] || null;
}

export function getPointsOfInterest(state: GameState): PointOfInterestState[] {
  return Object.values(state.setting?.pointsOfInterestById || {});
}

export function getPointOfInterestById(state: GameState, poiId: string): PointOfInterestState | null {
  return state.setting?.pointsOfInterestById?.[poiId] || null;
}

export function getPointsOfInterestForDistrict(state: GameState, districtId: string): PointOfInterestState[] {
  return getPointsOfInterest(state).filter((poi) => poi.districtId === districtId);
}

export function getFactions(state: GameState): FactionState[] {
  return Object.values(state.setting?.factionsById || {});
}

export function getFactionById(state: GameState, factionId: string): FactionState | null {
  return state.setting?.factionsById?.[factionId] || null;
}

export function getFactionsForPointOfInterest(state: GameState, poiId: string): FactionState[] {
  const poi = getPointOfInterestById(state, poiId);
  if (!poi) return [];
  return (poi.factionIds || [])
    .map((factionId) => getFactionById(state, factionId))
    .filter((faction): faction is FactionState => Boolean(faction));
}

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
