import { createInventoryGridView } from './inventoryGridView.js';

export function createInventoryScreen({ GUI, textureUrl, scale, viewportWidth, viewportHeight }) {
  return createInventoryGridView({ GUI, textureUrl, scale, viewportWidth, viewportHeight });
}
