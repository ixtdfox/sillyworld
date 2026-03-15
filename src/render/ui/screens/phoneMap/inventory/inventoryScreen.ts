/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи. Фокус файла — инвентарь: вес, экипировка, перенос предметов и представление слотов.
 */
import { createInventoryGridView, type InventoryGridViewProps } from './inventoryGridView.ts';

/** Создаёт и настраивает `createInventoryScreen` в ходе выполнения связанного игрового сценария. */
export function createInventoryScreen(props: InventoryGridViewProps) {
  return createInventoryGridView(props);
}
