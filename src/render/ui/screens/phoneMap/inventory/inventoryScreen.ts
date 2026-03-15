import { createInventoryGridView, type InventoryGridViewProps } from './inventoryGridView.ts';

export function createInventoryScreen(props: InventoryGridViewProps) {
  return createInventoryGridView(props);
}
