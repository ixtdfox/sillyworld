import { createInventoryGridView, type InventoryGridViewProps } from './inventoryGridView.ts';

/** Создаёт и настраивает `createInventoryScreen` в ходе выполнения связанного игрового сценария. */
export function createInventoryScreen(props: InventoryGridViewProps) {
  return createInventoryGridView(props);
}
