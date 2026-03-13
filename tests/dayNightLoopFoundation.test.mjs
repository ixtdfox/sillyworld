import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { createWorldStore } from '../src/world/worldStore.ts';
import { TIME_OF_DAY, TIME_PHASE, TIME_PHASE_ORDER } from '../src/world/constant/types.ts';
import { createGameState } from '../src/world/worldState.ts';
import {
  advanceTime,
  advanceTimeBySteps,
  advanceToTimePhase,
  getStepsUntilPhase,
  normalizeTimePhase,
  setTimeOfDay,
  setTimePhase
} from '../src/world/time/timeActions.ts';
import { consumeNextPhaseTransition } from '../src/world/map/phaseTransitionActions.ts';
import { evaluateLocationAvailability, getLocationAvailability } from '../src/world/map/locationAvailabilitySelectors.ts';
import { evaluateNpcAvailability, getNpcAvailability, getNpcsForLocation } from '../src/world/character/npcAvailabilitySelectors.ts';

const seed = JSON.parse(fs.readFileSync(new URL('../src/world/seed_world.json', import.meta.url), 'utf8'));

test('phase model validity: normalization and world defaults stay coherent', () => {
  assert.equal(normalizeTimePhase(TIME_PHASE.Evening), TIME_PHASE.Evening);
  assert.equal(normalizeTimePhase(TIME_OF_DAY.Night), TIME_PHASE.Night);
  assert.equal(normalizeTimePhase('invalid-phase', TIME_PHASE.Day), TIME_PHASE.Day);

  const initial = createGameState({ world: { timeOfDay: TIME_OF_DAY.Evening } });
  assert.equal(initial.world.timePhase, TIME_PHASE.Evening);
  assert.equal(initial.world.timeOfDay, TIME_OF_DAY.Evening);

  const next = setTimePhase(initial, TIME_PHASE.Night);
  assert.equal(next.world.timePhase, TIME_PHASE.Night);
  assert.equal(next.world.timeOfDay, TIME_OF_DAY.Night);

  const unchanged = setTimePhase(next, 'not-a-phase');
  assert.equal(unchanged, next);

  const byLegacyValue = setTimeOfDay(next, TIME_OF_DAY.Day);
  assert.equal(byLegacyValue.world.timePhase, TIME_PHASE.Day);
  assert.equal(byLegacyValue.world.timeOfDay, TIME_OF_DAY.Day);
});

test('time advancement: step counts and day wrap remain deterministic', () => {
  const store = createWorldStore(seed);
  store.setTimePhase(TIME_PHASE.Morning);

  const stepped = advanceTimeBySteps(store.getState(), 4);
  assert.equal(stepped.world.timePhase, TIME_PHASE.Morning);
  assert.equal(stepped.world.clock.dayNumber, 2);
  assert.equal(stepped.world.clock.step, 4);

  const noChange = advanceTimeBySteps(stepped, -7);
  assert.equal(noChange, stepped);

  const oneTick = advanceTime(stepped);
  assert.equal(oneTick.world.timePhase, TIME_PHASE.Day);
  assert.equal(oneTick.world.clock.dayNumber, 2);
  assert.equal(oneTick.world.clock.step, 5);
});

test('phase transition behavior: transitions encode ordered boundaries and queue consumption', () => {
  const store = createWorldStore(seed);
  store.setTimePhase(TIME_PHASE.Evening);

  const progressed = advanceTimeBySteps(store.getState(), 3, { trigger: 'foundation-test' });
  const pending = progressed.world.phaseTransitions.pending;
  assert.equal(pending.length, 3);
  assert.deepEqual(
    pending.map((transition) => transition.fromPhase),
    [TIME_PHASE.Evening, TIME_PHASE.Night, TIME_PHASE.Morning]
  );
  assert.deepEqual(
    pending.map((transition) => transition.toPhase),
    [TIME_PHASE.Night, TIME_PHASE.Morning, TIME_PHASE.Day]
  );
  assert.equal(new Set(pending.map((transition) => transition.id)).size, pending.length);
  assert.equal(pending.every((transition) => transition.trigger === 'foundation-test'), true);

  let queueState = progressed;
  let consumedCount = 0;
  while (queueState.world.phaseTransitions.pending.length > 0) {
    const result = consumeNextPhaseTransition(queueState);
    assert.notEqual(result.transition, null);
    queueState = result.state;
    consumedCount += 1;
  }
  assert.equal(consumedCount, 3);
  assert.equal(queueState.world.phaseTransitions.history.length, 3);
});

test('location availability by phase: pure evaluator and seed-backed lookups remain aligned', () => {
  const notNight = evaluateLocationAvailability({ availability: { mode: 'not-night' } }, TIME_PHASE.Night);
  assert.equal(notNight.available, false);

  const phaseList = evaluateLocationAvailability(
    {
      availability: {
        mode: 'phase-list',
        allowedPhases: [TIME_PHASE.Day, TIME_PHASE.Evening],
        preferredPhases: [TIME_PHASE.Evening]
      }
    },
    TIME_PHASE.Evening
  );
  assert.equal(phaseList.available, true);
  assert.equal(phaseList.preferred, true);

  const restricted = evaluateLocationAvailability(
    { availability: { mode: 'restricted', restrictedProfile: 'old-city-epic-lock' } },
    TIME_PHASE.Day
  );
  assert.equal(restricted.available, false);
  assert.equal(restricted.reason.includes('later chapter'), true);

  const store = createWorldStore(seed);
  store.setTimePhase(TIME_PHASE.Night);
  const archiveAtNight = getLocationAvailability(store.getState(), {
    districtId: 'district:new-city',
    poiId: 'poi:civic-archive'
  });
  assert.equal(archiveAtNight.available, false);

  const barAtNight = getLocationAvailability(store.getState(), {
    districtId: 'district:ashline',
    poiId: 'poi:last-light-bar'
  });
  assert.equal(barAtNight.available, true);
  assert.equal(barAtNight.preferred, true);
});

test('npc availability by phase: schedule rules and location ties stay enforceable', () => {
  const dayRule = evaluateNpcAvailability(
    {
      availability: {
        byPhase: {
          [TIME_PHASE.Day]: { available: true, locationId: 'building:last-light-bar' },
          [TIME_PHASE.Night]: { available: false, reason: 'Off-shift.' }
        }
      }
    },
    TIME_PHASE.Day,
    'building:night-pharmacy'
  );
  assert.equal(dayRule.available, false);
  assert.equal(dayRule.reason.includes('Usually found at'), true);

  const boolRule = evaluateNpcAvailability(
    {
      availability: {
        byPhase: {
          [TIME_PHASE.Evening]: true
        }
      }
    },
    TIME_PHASE.Evening,
    'building:anywhere'
  );
  assert.equal(boolRule.available, true);

  const store = createWorldStore(seed);
  store.setTimePhase(TIME_PHASE.Day);
  const dayBarNpcs = getNpcsForLocation(store.getState(), 'building:last-light-bar', { onlyAvailable: true });
  assert.equal(dayBarNpcs.some((npc) => npc.id === 'npc:ivo-rask'), false);

  store.setTimePhase(TIME_PHASE.Evening);
  const eveningBarNpcs = getNpcsForLocation(store.getState(), 'building:last-light-bar', { onlyAvailable: true });
  assert.equal(eveningBarNpcs.some((npc) => npc.id === 'npc:ivo-rask'), true);

  const unknown = getNpcAvailability(store.getState(), { npcNodeId: 'npc:missing' });
  assert.equal(unknown.available, false);
  assert.equal(unknown.reason, 'Unknown contact.');
});

test('skip/rest baseline behavior: targeted skip and rest time always move time forward', () => {
  const store = createWorldStore(seed);
  store.setTimePhase(TIME_PHASE.Morning);

  const skipped = advanceToTimePhase(store.getState(), TIME_PHASE.Morning, {
    trigger: 'skip-baseline'
  });
  assert.equal(skipped.world.timePhase, TIME_PHASE.Day);
  assert.equal(skipped.world.clock.step, 1);
  assert.equal(skipped.world.phaseTransitions.pending[0].trigger, 'skip-baseline');

  const noProgressSkip = advanceToTimePhase(store.getState(), TIME_PHASE.Morning, {
    requireForwardProgress: false
  });
  assert.equal(noProgressSkip.world.timePhase, TIME_PHASE.Morning);
  assert.equal(noProgressSkip.world.clock.step, 0);

  const available = store.getAvailableRestActions().map((entry) => entry.id).sort();
  assert.deepEqual(available, ['advance-to-next-phase', 'rest-until-evening', 'sleep-until-morning']);

  const nextPhaseRest = store.performRestAction('advance-to-next-phase');
  assert.equal(nextPhaseRest.ok, true);
  assert.equal(nextPhaseRest.timeCostSteps, 1);

  const sleepFromDay = store.performRestAction('sleep-until-morning');
  assert.equal(sleepFromDay.ok, true);
  assert.equal(sleepFromDay.timeCostSteps, 3);

  const stepsToMorning = getStepsUntilPhase(store.getTimePhase(), TIME_PHASE.Morning);
  assert.equal(stepsToMorning, 0);

  assert.deepEqual(TIME_PHASE_ORDER, [TIME_PHASE.Morning, TIME_PHASE.Day, TIME_PHASE.Evening, TIME_PHASE.Night]);
});
