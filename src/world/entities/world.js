import { TIME_OF_DAY } from '../constants/types.js';

export function createDefaultWorld(seed = {}) {
  return {
    timeOfDay: seed.timeOfDay || TIME_OF_DAY.Morning,
    clock: {
      dayNumber: seed.clock?.dayNumber || 1,
      step: seed.clock?.step || 0
    }
  };
}
