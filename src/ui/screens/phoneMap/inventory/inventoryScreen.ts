import { createInventoryGridView, type InventoryGridViewProps } from './inventoryGridView.js';

export function createInventoryScreen(props: InventoryGridViewProps) {
  return createInventoryGridView(props);
}
