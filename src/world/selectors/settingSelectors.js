function getDistricts(state) {
  return Object.values(state.setting?.districtsById || {});
}
function getDistrictById(state, districtId) {
  return state.setting?.districtsById?.[districtId] || null;
}
function getPointsOfInterest(state) {
  return Object.values(state.setting?.pointsOfInterestById || {});
}
function getPointOfInterestById(state, poiId) {
  return state.setting?.pointsOfInterestById?.[poiId] || null;
}
function getPointsOfInterestForDistrict(state, districtId) {
  return getPointsOfInterest(state).filter((poi) => poi.districtId === districtId);
}
function getFactions(state) {
  return Object.values(state.setting?.factionsById || {});
}
function getFactionById(state, factionId) {
  return state.setting?.factionsById?.[factionId] || null;
}
function getFactionsForPointOfInterest(state, poiId) {
  const poi = getPointOfInterestById(state, poiId);
  if (!poi) return [];
  return (poi.factionIds || []).map((factionId) => getFactionById(state, factionId)).filter((faction) => Boolean(faction));
}
function getLocationMeta(state, { districtId = null, poiId = null } = {}) {
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
export {
  getDistrictById,
  getDistricts,
  getFactionById,
  getFactions,
  getFactionsForPointOfInterest,
  getLocationMeta,
  getPointOfInterestById,
  getPointsOfInterest,
  getPointsOfInterestForDistrict
};
