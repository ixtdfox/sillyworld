import { indexBy } from '../utils/object.js';

export function createDefaultCharacters(seed = []) {
  return {
    byId: seed.byId || indexBy(seed, 'id')
  };
}
