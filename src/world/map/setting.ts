import type {
  DistrictState,
  FactionState,
  GameState,
  LocationMetaState,
  MapsState,
  PointOfInterestState,
  SettingState,
  MapNodeState
} from '../contracts.ts';
import { indexBy } from '../utils/object.ts';

const DEFAULT_DANGER_LEVEL = 'moderate';
const DEFAULT_QUARANTINE_STATUS = 'clear';
const DEFAULT_AVAILABILITY_MODE = 'always';

/** Выполняет `asArray` в ходе выполнения связанного игрового сценария. */
function asArray<T>(value: T[] | unknown): T[] {
  return Array.isArray(value) ? value : [];
}

/** Нормализует `normalizeLocationMeta` в ходе выполнения связанного игрового сценария. */
function normalizeLocationMeta(meta: Partial<LocationMetaState> = {}): LocationMetaState {
  const allowedPhases = asArray(meta.availability?.allowedPhases ?? []) as LocationMetaState['availability']['allowedPhases'];
  const preferredPhases = asArray(meta.availability?.preferredPhases ?? []) as LocationMetaState['availability']['preferredPhases'];

  const mode = meta.availability?.mode
    ?? (meta.nightAccessAllowed === false ? 'not-night' : DEFAULT_AVAILABILITY_MODE);

  return {
    dangerLevel: meta.dangerLevel ?? DEFAULT_DANGER_LEVEL,
    accessRestrictions: asArray(meta.accessRestrictions),
    nightAccessAllowed: meta.nightAccessAllowed ?? true,
    quarantineStatus: meta.quarantineStatus ?? DEFAULT_QUARANTINE_STATUS,
    availability: {
      mode,
      allowedPhases,
      preferredPhases,
      unavailableReason: meta.availability?.unavailableReason ?? '',
      restrictedProfile: meta.availability?.restrictedProfile ?? ''
    }
  };
}

/** Нормализует `normalizeDistrict` в ходе выполнения связанного игрового сценария. */
function normalizeDistrict(district: Partial<DistrictState>): DistrictState {
  return {
    id: district.id ?? '',
    nodeId: district.nodeId ?? district.id ?? '',
    name: district.name ?? district.id ?? '',
    zoneType: district.zoneType ?? 'urban',
    controllingFactionId: district.controllingFactionId ?? null,
    meta: normalizeLocationMeta(district.meta)
  };
}

/** Нормализует `normalizePointOfInterest` в ходе выполнения связанного игрового сценария. */
function normalizePointOfInterest(poi: Partial<PointOfInterestState>): PointOfInterestState {
  return {
    id: poi.id ?? '',
    nodeId: poi.nodeId ?? '',
    districtId: poi.districtId ?? null,
    name: poi.name ?? poi.id ?? '',
    poiType: poi.poiType ?? 'landmark',
    factionIds: asArray(poi.factionIds),
    meta: normalizeLocationMeta(poi.meta)
  };
}

/** Нормализует `normalizeFaction` в ходе выполнения связанного игрового сценария. */
function normalizeFaction(faction: Partial<FactionState>): FactionState {
  return {
    id: faction.id ?? '',
    name: faction.name ?? faction.id ?? '',
    kind: faction.kind ?? 'civic',
    influence: faction.influence ?? 'local'
  };
}

/** Выполняет `inferSettingFromMaps` в ходе выполнения связанного игрового сценария. */
function inferSettingFromMaps(maps: Partial<MapsState> = {}): SettingState {
  const nodes: MapNodeState[] = Object.values(maps.nodesById ?? {});

  const districts = nodes
    .filter((node) => node.level === 'district')
    .map((node) => normalizeDistrict({
      id: node.id,
      nodeId: node.id,
      name: node.name ?? '',
      zoneType: typeof node.meta?.['zoneType'] === 'string' ? node.meta['zoneType'] : 'urban',
      meta: normalizeLocationMeta((node.meta?.['locationMeta'] as Partial<LocationMetaState> | undefined) ?? {})
    }));

  const pointsOfInterest = nodes
    .filter((node) => node.level === 'building')
    .map((node) => normalizePointOfInterest({
      id: `poi:${node.id.split(':')[1] ?? node.id}`,
      nodeId: node.id,
      districtId: node.parentId ?? null,
      name: node.name ?? '',
      poiType: node.type ?? 'landmark',
      meta: normalizeLocationMeta((node.meta?.['locationMeta'] as Partial<LocationMetaState> | undefined) ?? {})
    }));

  return {
    districtsById: indexBy(districts, 'id'),
    pointsOfInterestById: indexBy(pointsOfInterest, 'id'),
    factionsById: {}
  };
}

/** Определяет контракт `SettingSeed` для согласованного взаимодействия модулей в контексте `world/map/setting`. */
interface SettingSeed extends Partial<SettingState> {
  districts?: Partial<DistrictState>[];
  pointsOfInterest?: Partial<PointOfInterestState>[];
  factions?: Partial<FactionState>[];
}

/** Создаёт и настраивает `createDefaultSetting` в ходе выполнения связанного игрового сценария. */
export function createDefaultSetting(seed: SettingSeed = {}, maps: GameState['maps'] = { levelConfigs: {}, nodesById: {} }): SettingState {
  const inferred = inferSettingFromMaps(maps);

  const districts = asArray<Partial<DistrictState>>(seed.districts).map(normalizeDistrict);
  const pointsOfInterest = asArray<Partial<PointOfInterestState>>(seed.pointsOfInterest).map(normalizePointOfInterest);
  const factions = asArray<Partial<FactionState>>(seed.factions).map(normalizeFaction);

  return {
    districtsById: {
      ...inferred.districtsById,
      ...(seed.districtsById ?? indexBy(districts, 'id'))
    },
    pointsOfInterestById: {
      ...inferred.pointsOfInterestById,
      ...(seed.pointsOfInterestById ?? indexBy(pointsOfInterest, 'id'))
    },
    factionsById: {
      ...inferred.factionsById,
      ...(seed.factionsById ?? indexBy(factions, 'id'))
    }
  };
}
