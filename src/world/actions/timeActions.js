import { TIME_OF_DAY_ORDER } from '../constants/types.js';

export function setTimeOfDay(state, nextTimeOfDay) {
  if (!TIME_OF_DAY_ORDER.includes(nextTimeOfDay)) return state;
  return {
    ...state,
    world: {
      ...state.world,
      timeOfDay: nextTimeOfDay
    },
    updatedAt: Date.now()
  };
}

export function advanceTime(state) {
  const currentIndex = TIME_OF_DAY_ORDER.indexOf(state.world.timeOfDay);
  const nextIndex = (currentIndex + 1) % TIME_OF_DAY_ORDER.length;
  const wrapped = nextIndex === 0;

  return {
    ...state,
    world: {
      ...state.world,
      timeOfDay: TIME_OF_DAY_ORDER[nextIndex],
      clock: {
        dayNumber: wrapped ? state.world.clock.dayNumber + 1 : state.world.clock.dayNumber,
        step: state.world.clock.step + 1
      }
    },
    updatedAt: Date.now()
  };
}
