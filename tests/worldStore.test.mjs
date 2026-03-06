import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createWorldStore } from '../src/world/worldStore.js';
import { TIME_OF_DAY, TIME_PHASE } from '../src/world/constants/types.js';
import { getInventoryWeight, canTakeItem } from '../src/world/selectors/inventorySelectors.js';
import { advanceTime } from '../src/world/actions/timeActions.js';
import { setRelationship as setRelationshipAction } from '../src/world/actions/relationshipActions.js';
import { deserializeGameState, serializeGameState } from '../src/world/worldPersistence.js';
import { getDistrictById, getFactionsForPointOfInterest, getLocationMeta, getPointOfInterestById, getPointsOfInterestForDistrict } from '../src/world/selectors/settingSelectors.js';

const seed = JSON.parse(fs.readFileSync(new URL('../src/world/seed_world.json', import.meta.url), 'utf8'));

function indexNodesById(nodes) {
  return new Map(nodes.map((node) => [node.id, node]));
}

function assertHasNodes(nodesById, ids, label) {
  for (const id of ids) {
    assert.equal(nodesById.has(id), true, `missing ${label} ${id}`);
  }
}

test('seed world has city foundation districts and MVP locations', () => {
  const nodes = seed.maps.nodes;
  const hasNode = (id) => nodes.some((node) => node.id === id);

  const requiredDistricts = [
    'district:new-city',
    'district:old-city',
    'district:ashline',
    'district:industrial-outskirts',
    'district:ivory-isle'
  ];
  const requiredLocations = [
    'building:rowan-flat-2b',
    'building:last-light-bar',
    'building:night-pharmacy',
    'building:civic-archive',
    'building:street-market',
    'building:south-gate',
    'building:ruined-factory'
  ];

  for (const nodeId of [...requiredDistricts, ...requiredLocations]) {
    assert.equal(hasNode(nodeId), true, `missing node ${nodeId}`);
  }
});

test('setting model seed defines districts, POIs, factions, and location metadata', () => {
  assert.equal(Array.isArray(seed.setting.districts), true);
  assert.equal(Array.isArray(seed.setting.pointsOfInterest), true);
  assert.equal(Array.isArray(seed.setting.factions), true);

  const oldCity = seed.setting.districts.find((d) => d.id === 'district:old-city');
  assert.equal(oldCity.meta.quarantineStatus, 'sealed');
  assert.equal(oldCity.meta.nightAccessAllowed, false);

  const factory = seed.setting.pointsOfInterest.find((poi) => poi.id === 'poi:ruined-factory');
  assert.equal(factory.meta.dangerLevel, 'extreme');
  assert.deepEqual(factory.meta.accessRestrictions, ['hazmat-gear-required']);
});

test('setting selectors resolve district/poi/faction links', () => {
  const store = createWorldStore(seed);
  const state = store.getState();

  const ashline = getDistrictById(state, 'district:ashline');
  assert.equal(ashline.controllingFactionId, 'faction:gate-watch');

  const poi = getPointOfInterestById(state, 'poi:south-gate');
  assert.equal(poi.nodeId, 'building:south-gate');

  const ashlinePois = getPointsOfInterestForDistrict(state, 'district:ashline');
  assert.equal(ashlinePois.length >= 2, true);

  const factions = getFactionsForPointOfInterest(state, 'poi:south-gate');
  assert.equal(factions[0].id, 'faction:gate-watch');

  const locationMeta = getLocationMeta(state, { poiId: 'poi:ruined-factory' });
  assert.equal(locationMeta.quarantineStatus, 'sealed');
});

test('time action: advanceTime cycles night -> morning and increments day', () => {
  const store = createWorldStore(seed);
  store.setTimeOfDay(TIME_OF_DAY.Night);

  const next = advanceTime(store.getState());
  assert.equal(next.world.timePhase, TIME_PHASE.Morning);
  assert.equal(next.world.timeOfDay, TIME_OF_DAY.Morning);
  assert.equal(next.world.clock.dayNumber, 2);
});

test('inventory selectors: weight and canTakeItem are deterministic', () => {
  const store = createWorldStore(seed);
  store.addItemToPlayer('item:flashlight-1');

  const state = store.getState();
  assert.equal(getInventoryWeight(state), 0.95);
  assert.equal(canTakeItem(state, 'item:painkillers-pack'), true);
});

test('store inventory action: addItemToPlayer rejects overflow', () => {
  const heavySeed = {
    ...seed,
    player: { ...seed.player, carryCapacityWeight: 0.2 }
  };
  const store = createWorldStore(heavySeed);
  assert.equal(store.addItemToPlayer('item:water-bottle'), false);
});

test('equip/unequip flow', () => {
  const store = createWorldStore(seed);
  store.addItemToPlayer('item:flashlight-1');
  assert.equal(store.moveItemToSlot('item:flashlight-1', 'rightHand'), true);
  assert.equal(store.getState().player.equipped.rightHand, 'item:flashlight-1');
  store.unequipSlot('rightHand');
  assert.equal(store.getState().player.equipped.rightHand, undefined);
});

test('relationship action clamps and returns level', () => {
  const store = createWorldStore(seed);
  const result = setRelationshipAction(store.getState(), 'captain-sena-holt', 120);
  assert.equal(result.level, 100);
  assert.equal(result.nextState.player.relationships['captain-sena-holt'].level, 100);
});

test('seed world includes foundational npc roster discoverable at relevant locations', () => {
  const requiredNpcNodes = {
    'npc:lana-vey': 'building:ivory-club',
    'npc:ivo-rask': 'building:last-light-bar',
    'npc:dr-olek-mirov': 'building:night-pharmacy',
    'npc:captain-sena-holt': 'building:south-gate',
    'npc:yara-dene': 'building:old-plaza',
    'npc:elena-sable': 'building:civic-archive'
  };

  for (const [npcNodeId, parentId] of Object.entries(requiredNpcNodes)) {
    const node = seed.maps.nodes.find((entry) => entry.id === npcNodeId);
    assert.equal(Boolean(node), true, `missing npc node ${npcNodeId}`);
    assert.equal(node.parentId, parentId);
    assert.equal(node.meta.stCharacterName?.length > 0, true);
  }
});

test('seed world keeps starting location and core POIs wired correctly', () => {
  const nodes = seed.maps.nodes;
  const nodesById = indexNodesById(nodes);

  const requiredPois = [
    'poi:rowan-flat-2b',
    'poi:last-light-bar',
    'poi:night-pharmacy',
    'poi:civic-archive',
    'poi:south-gate',
    'poi:old-plaza',
    'poi:ruined-factory',
    'poi:ivory-club'
  ];

  const poisById = new Map(seed.setting.pointsOfInterest.map((poi) => [poi.id, poi]));
  for (const poiId of requiredPois) {
    assert.equal(poisById.has(poiId), true, `missing required poi ${poiId}`);
  }

  assert.equal(nodesById.has(seed.player.currentNodeId), true, 'player current node does not exist');
  assert.equal(nodesById.has(seed.player.homeNodeId), true, 'player home node does not exist');
  assert.equal(seed.player.currentNodeId, 'building:rowan-flat-2b');
  assert.equal(seed.player.homeNodeId, 'building:rowan-flat-2b');

  const homePoi = seed.setting.pointsOfInterest.find((poi) => poi.nodeId === seed.player.homeNodeId);
  assert.equal(Boolean(homePoi), true, 'player home node is not represented by any point of interest');
});

test('seed setting references valid district, poi, and faction ids', () => {
  const nodesById = indexNodesById(seed.maps.nodes);
  const districtIds = new Set(seed.setting.districts.map((district) => district.id));
  const factionIds = new Set(seed.setting.factions.map((faction) => faction.id));

  for (const district of seed.setting.districts) {
    assert.equal(nodesById.has(district.nodeId), true, `district node is missing for ${district.id}`);
    assert.equal(district.id, district.nodeId, `district id/node mismatch for ${district.id}`);
    assert.equal(Boolean(district.controllingFactionId), true, `district ${district.id} missing controlling faction`);
    assert.equal(factionIds.has(district.controllingFactionId), true, `district ${district.id} has unknown controlling faction`);
  }

  for (const poi of seed.setting.pointsOfInterest) {
    assert.equal(nodesById.has(poi.nodeId), true, `poi node is missing for ${poi.id}`);
    assert.equal(districtIds.has(poi.districtId), true, `poi ${poi.id} has unknown district`);

    for (const factionId of poi.factionIds || []) {
      assert.equal(factionIds.has(factionId), true, `poi ${poi.id} has unknown faction ${factionId}`);
    }
  }
});

test('seed navigation graph does not contain obvious broken links', () => {
  const nodes = seed.maps.nodes;
  const nodesById = indexNodesById(nodes);
  const levelConfigs = seed.maps.levelConfigs;

  for (const node of nodes) {
    assert.equal(Boolean(levelConfigs[node.level]), true, `node ${node.id} uses unknown level ${node.level}`);

    if (!node.parentId) continue;

    const parent = nodesById.get(node.parentId);
    assert.notEqual(node.parentId, node.id, `node ${node.id} cannot be its own parent`);
    assert.equal(Boolean(parent), true, `node ${node.id} has missing parent ${node.parentId}`);

    const parentLevelConfig = levelConfigs[parent.level] || {};
    const allowedTypes = parentLevelConfig.nodeTypesAllowed || [];
    assert.equal(
      allowedTypes.includes(node.type),
      true,
      `node ${node.id} type ${node.type} not allowed under parent level ${parent.level}`
    );
  }
});

test('characters, npc map nodes, and relationship scaffolding stay in sync', () => {
  const nodesById = indexNodesById(seed.maps.nodes);
  const charactersById = new Map(seed.characters.map((character) => [character.id, character]));
  const relationshipIds = new Set(Object.keys(seed.player.relationships));

  const coreCharacterIds = [
    'lana-vey',
    'ivo-rask',
    'dr-olek-mirov',
    'captain-sena-holt',
    'yara-dene',
    'elena-sable'
  ];

  assertHasNodes(nodesById, coreCharacterIds.map((id) => `npc:${id}`), 'npc node');

  for (const characterId of coreCharacterIds) {
    const character = charactersById.get(characterId);
    assert.equal(Boolean(character), true, `missing character ${characterId}`);
    assert.equal(relationshipIds.has(characterId), true, `missing relationship seed for ${characterId}`);

    const npcNode = nodesById.get(`npc:${characterId}`);
    assert.equal(character.currentNodeId, npcNode.id, `character ${characterId} currentNodeId mismatch`);
    assert.equal(character.homeNodeId, npcNode.parentId, `character ${characterId} homeNodeId mismatch`);
    assert.equal(npcNode.meta?.id, characterId, `npc meta.id mismatch for ${characterId}`);
  }
});

test('relationship scaffolding includes axes, tags, stance, and flags for core contacts', () => {
  const coreRelationship = seed.player.relationships['lana-vey'];
  assert.equal(coreRelationship.stance, 'volatile');
  assert.equal(Array.isArray(coreRelationship.tags), true);
  assert.equal(typeof coreRelationship.axes.officialNarrativeLoyalty, 'number');
  assert.equal(typeof coreRelationship.flags.blocksDirectQuestions, 'boolean');
});

test('serialization + hydration + migration from v1-like payload', () => {
  const store = createWorldStore(seed);
  store.advanceTime();
  const json = serializeGameState(store.getState());
  const restored = deserializeGameState(json, seed);
  assert.equal(restored.world.timeOfDay, TIME_OF_DAY.Day);

  const legacyV1 = {
    schemaVersion: 1,
    world: { timeOfDay: TIME_OF_DAY.Evening, clock: { dayNumber: 3, step: 9 } },
    player: seed.player,
    maps: seed.maps,
    items: seed.items,
    characters: { byId: {} },
    ui: { level: 'city' }
  };
  const migrated = deserializeGameState(JSON.stringify(legacyV1), seed);
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.world.timeOfDay, TIME_OF_DAY.Evening);
  assert.equal(migrated.world.timePhase, TIME_PHASE.Evening);
  assert.equal(migrated.ui, undefined);
  assert.equal(Object.keys(migrated.setting.districtsById).length > 0, true);
});

test('migration from v2 state infers setting from map nodes when setting is absent', () => {
  const legacyV2 = {
    schemaVersion: 2,
    world: seed.world,
    player: seed.player,
    maps: seed.maps,
    items: seed.items,
    characters: { byId: {} }
  };

  const migrated = deserializeGameState(JSON.stringify(legacyV2), seed);
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(getDistrictById(migrated, 'district:new-city').id, 'district:new-city');
  assert.equal(getPointOfInterestById(migrated, 'poi:rowan-flat-2b').nodeId, 'building:rowan-flat-2b');
});



test('time phase selectors and store API expose normalized gameplay phase', () => {
  const store = createWorldStore(seed);

  assert.equal(store.getTimePhase(), TIME_PHASE.Morning);
  store.setTimePhase(TIME_PHASE.Evening);
  assert.equal(store.getTimePhase(), TIME_PHASE.Evening);
  assert.equal(store.getTimeOfDay(), TIME_OF_DAY.Evening);

  store.setTimeOfDay(TIME_OF_DAY.Night);
  assert.equal(store.getTimePhase(), TIME_PHASE.Night);
  assert.equal(store.getState().world.timePhase, TIME_PHASE.Night);
});

test('migration from schema v3 adds gameplay timePhase from legacy timeOfDay', () => {
  const legacyV3 = {
    schemaVersion: 3,
    world: { timeOfDay: TIME_OF_DAY.Night, clock: { dayNumber: 7, step: 21 } },
    player: seed.player,
    maps: seed.maps,
    items: seed.items,
    characters: seed.characters,
    setting: seed.setting
  };

  const migrated = deserializeGameState(JSON.stringify(legacyV3), seed);
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.world.timeOfDay, TIME_OF_DAY.Night);
  assert.equal(migrated.world.timePhase, TIME_PHASE.Night);
});

test('hydrate fails cleanly on invalid json', () => {
  const store = createWorldStore(seed);
  assert.equal(store.hydrate('{bad json'), false);
  assert.equal(store.getState().world.timeOfDay, TIME_OF_DAY.Morning);
});
