/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи. Фокус файла — инвентарь: вес, экипировка, перенос предметов и представление слотов.
 */
import { PHONE_DISPLAY_BOUNDS } from '../phoneDisplayLayout.ts';

/** Определяет контракт `PhoneScale` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/inventory/inventoryConfig`. */
interface PhoneScale {
  x: (value: number) => number;
  y: (value: number) => number;
  w: (value: number) => number;
  h: (value: number) => number;
}

/** Константа `INVENTORY_LAYOUT` хранит общие настройки/данные, которые переиспользуются в модуле `render/ui/screens/phoneMap/inventory/inventoryConfig`. */
export const INVENTORY_LAYOUT = Object.freeze({
  columns: 3,
  rows: 10,
  originX: 81,
  originY: 160,
  slotWidth: 133,
  slotHeight: 135,
  scrollbarWidth: 12,
  scrollbarPadding: 4,
  contextMenuWidth: 96,
  contextMenuHeight: 44,
  contextMenuOffsetX: 8,
  contextMenuOffsetY: 8
});

/** Константа `INVENTORY_SLOT_REGION` хранит общие настройки/данные, которые переиспользуются в модуле `render/ui/screens/phoneMap/inventory/inventoryConfig`. */
export const INVENTORY_SLOT_REGION = Object.freeze({
  x: 333,
  y: 0,
  width: 133,
  height: 135
});

/** Возвращает `getInventoryLayoutMetrics` в ходе выполнения связанного игрового сценария. */
export function getInventoryLayoutMetrics(scale: PhoneScale) {
  const originX = scale.x(INVENTORY_LAYOUT.originX - PHONE_DISPLAY_BOUNDS.left);
  const originY = scale.y(INVENTORY_LAYOUT.originY - PHONE_DISPLAY_BOUNDS.top);
  const slotWidth = scale.w(INVENTORY_LAYOUT.slotWidth);
  const slotHeight = scale.h(INVENTORY_LAYOUT.slotHeight);

  const contentWidth = INVENTORY_LAYOUT.columns * slotWidth;
  const contentHeight = INVENTORY_LAYOUT.rows * slotHeight;

  return {
    originX,
    originY,
    slotWidth,
    slotHeight,
    contentWidth,
    contentHeight,
    visibleHeight: Math.max(0, scale.h(PHONE_DISPLAY_BOUNDS.height) - originY),
    scrollbarLeft: originX + contentWidth + scale.w(INVENTORY_LAYOUT.scrollbarPadding),
    scrollbarWidth: scale.w(INVENTORY_LAYOUT.scrollbarWidth)
  };
}
