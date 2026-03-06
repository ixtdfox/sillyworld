import { indexBy } from '../utils/object.js';

const DEFAULT_DANGER_LEVEL = 'moderate';
const DEFAULT_QUARANTINE_STATUS = 'clear';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeLocationMeta(meta = {}) {
  return {
    dangerLevel: meta.dangerLevel || DEFAULT_DANGER_LEVEL,
    accessRestrictions: asArray(meta.accessRestrictions),
    nightAccessAllowed: meta.nightAccessAllowed ?? true,
    quarantineStatus: meta.quarantineStatus || DEFAULT_QUARANTINE_STATUS
  };
}

function normalizeDistrict(district) {
  return {
    id: district.id,
    nodeId: district.nodeId || district.id,
    name: district.name || district.id,
    zoneType: district.zoneType || 'urban',
    controllingFactionId: district.controllingFactionId || null,
    meta: normalizeLocationMeta(district.meta)
  };
}

function normalizePointOfInterest(poi) {
  return {
    id: poi.id,
    nodeId: poi.nodeId,
    districtId: poi.districtId || null,
    name: poi.name || poi.id,
    poiType: poi.poiType || 'landmark',
    factionIds: asArray(poi.factionIds),
    meta: normalizeLocationMeta(poi.meta)
  };
}

function normalizeFaction(faction) {
  return {
    id: faction.id,
    name: faction.name || faction.id,
    kind: faction.kind || 'civic',
    influence: faction.influence || 'local'
  };
}

function inferSettingFromMaps(maps = {}) {
  const nodes = Object.values(maps.nodesById || {});

  const districts = nodes
    .filter((node) => node.level === 'district')
    .map((node) => normalizeDistrict({
      id: node.id,
      nodeId: node.id,
      name: node.name,
      zoneType: node.meta?.zoneType || 'urban',
      meta: node.meta?.locationMeta || {}
    }));

  const pointsOfInterest = nodes
    .filter((node) => node.level === 'building')
    .map((node) => normalizePointOfInterest({
      id: `poi:${node.id.split(':')[1] || node.id}`,
      nodeId: node.id,
      districtId: node.parentId || null,
      name: node.name,
      poiType: node.type || 'landmark',
      meta: node.meta?.locationMeta || {}
    }));

  return {
    districtsById: indexBy(districts, 'id'),
    pointsOfInterestById: indexBy(pointsOfInterest, 'id'),
    factionsById: {}
  };
}

export function createDefaultSetting(seed = {}, maps = {}) {
  const inferred = inferSettingFromMaps(maps);

  const districts = asArray(seed.districts).map(normalizeDistrict);
  const pointsOfInterest = asArray(seed.pointsOfInterest).map(normalizePointOfInterest);
  const factions = asArray(seed.factions).map(normalizeFaction);

  return {
    districtsById: {
      ...inferred.districtsById,
      ...(seed.districtsById || indexBy(districts, 'id'))
    },
    pointsOfInterestById: {
      ...inferred.pointsOfInterestById,
      ...(seed.pointsOfInterestById || indexBy(pointsOfInterest, 'id'))
    },
    factionsById: {
      ...inferred.factionsById,
      ...(seed.factionsById || indexBy(factions, 'id'))
    }
  };
}
