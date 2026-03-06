export function getDistricts(state) {
  return Object.values(state.setting?.districtsById || {});
}

export function getDistrictById(state, districtId) {
  return state.setting?.districtsById?.[districtId] || null;
}

export function getPointsOfInterest(state) {
  return Object.values(state.setting?.pointsOfInterestById || {});
}

export function getPointOfInterestById(state, poiId) {
  return state.setting?.pointsOfInterestById?.[poiId] || null;
}

export function getPointsOfInterestForDistrict(state, districtId) {
  return getPointsOfInterest(state).filter((poi) => poi.districtId === districtId);
}

export function getFactions(state) {
  return Object.values(state.setting?.factionsById || {});
}

export function getFactionById(state, factionId) {
  return state.setting?.factionsById?.[factionId] || null;
}

export function getFactionsForPointOfInterest(state, poiId) {
  const poi = getPointOfInterestById(state, poiId);
  if (!poi) return [];
  return (poi.factionIds || [])
    .map((factionId) => getFactionById(state, factionId))
    .filter(Boolean);
}

export function getLocationMeta(state, { districtId = null, poiId = null } = {}) {
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
