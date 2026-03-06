import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createWorldStore } from '../src/world/worldStore.js';
import { TIME_OF_DAY } from '../src/world/constants/types.js';
import { getInventoryWeight, canTakeItem } from '../src/world/selectors/inventorySelectors.js';
import { advanceTime } from '../src/world/actions/timeActions.js';
import { setRelationship as setRelationshipAction } from '../src/world/actions/relationshipActions.js';
import { deserializeGameState, serializeGameState } from '../src/world/worldPersistence.js';

const seed = JSON.parse(fs.readFileSync(new URL('../src/world/seed_world.json', import.meta.url), 'utf8'));

test('time action: advanceTime cycles night -> morning and increments day', () => {
  const store = createWorldStore(seed);
  store.setTimeOfDay(TIME_OF_DAY.Night);

  const next = advanceTime(store.getState());
  assert.equal(next.world.timeOfDay, TIME_OF_DAY.Morning);
  assert.equal(next.world.clock.dayNumber, 2);
});

test('inventory selectors: weight and canTakeItem are deterministic', () => {
  const store = createWorldStore(seed);
  store.addItemToPlayer('item:sword-1');

  const state = store.getState();
  assert.equal(getInventoryWeight(state), 3);
  assert.equal(canTakeItem(state, 'item:apple-stack'), true);
});

test('store inventory action: addItemToPlayer rejects overflow', () => {
  const heavySeed = {
    ...seed,
    player: { ...seed.player, carryCapacityWeight: 2 }
  };
  const store = createWorldStore(heavySeed);
  assert.equal(store.addItemToPlayer('item:sword-1'), false);
});

test('equip/unequip flow', () => {
  const store = createWorldStore(seed);
  store.addItemToPlayer('item:sword-1');
  assert.equal(store.moveItemToSlot('item:sword-1', 'rightHand'), true);
  assert.equal(store.getState().player.equipped.rightHand, 'item:sword-1');
  store.unequipSlot('rightHand');
  assert.equal(store.getState().player.equipped.rightHand, undefined);
});

test('relationship action clamps and returns level', () => {
  const store = createWorldStore(seed);
  const result = setRelationshipAction(store.getState(), 'guard', 120);
  assert.equal(result.level, 100);
  assert.equal(result.nextState.player.relationships.guard.level, 100);
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
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.world.timeOfDay, TIME_OF_DAY.Evening);
  assert.equal(migrated.ui, undefined);
});

test('hydrate fails cleanly on invalid json', () => {
  const store = createWorldStore(seed);
  assert.equal(store.hydrate('{bad json'), false);
  assert.equal(store.getState().world.timeOfDay, TIME_OF_DAY.Morning);
});
