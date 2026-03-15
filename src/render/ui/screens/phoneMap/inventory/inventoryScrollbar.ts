/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи. Фокус файла — инвентарь: вес, экипировка, перенос предметов и представление слотов.
 */
import type { BabylonGuiLike, GuiControlLike, GuiSliderLike } from '../worldMapViewport.ts';

/** Выполняет `clamp` в ходе выполнения связанного игрового сценария. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Определяет контракт `InventoryScrollbarProps` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/inventory/inventoryScrollbar`. */
export interface InventoryScrollbarProps {
  GUI: BabylonGuiLike;
  viewportHeight: number;
  top: number;
  left: number;
  width: number;
  maxScroll: number;
  onScroll: (value: number) => void;
}

/** Определяет контракт `InventoryScrollbarController` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/inventory/inventoryScrollbar`. */
export interface InventoryScrollbarController {
  control: GuiControlLike;
  setValue: (value: number) => void;
  getValue: () => number;
  max: () => number;
}

/** Создаёт и настраивает `createInventoryScrollbar` в ходе выполнения связанного игрового сценария. */
export function createInventoryScrollbar({ GUI, viewportHeight, top, left, width, maxScroll, onScroll }: InventoryScrollbarProps): InventoryScrollbarController {
  const control = new GUI.Rectangle('inventory-scrollbar-root');
  control.width = `${width}px`;
  control.height = `${viewportHeight}px`;
  control.left = `${left}px`;
  control.top = `${top}px`;
  control.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  control.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  control.thickness = 1;
  control.color = '#0E1218';
  control.background = '#1F2530';
  control.isPointerBlocker = true;
  control.zIndex = 55;

  const thumbMinHeight = Math.max(16, Math.round(width * 1.4));
  const thumbHeight = maxScroll <= 0 ? viewportHeight : Math.max(thumbMinHeight, Math.round((viewportHeight / (viewportHeight + maxScroll)) * viewportHeight));

  const thumb = new GUI.Rectangle('inventory-scrollbar-thumb');
  thumb.width = `${Math.max(2, width - 4)}px`;
  thumb.height = `${thumbHeight}px`;
  thumb.leftInPixels = 0;
  thumb.topInPixels = 0;
  thumb.thickness = 1;
  thumb.color = '#DDE4EF';
  thumb.background = '#AEB8C8';
  thumb.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  thumb.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  thumb.isPointerBlocker = false;
  control.addControl(thumb);

  const slider = new GUI.Slider('inventory-scrollbar-slider') as GuiSliderLike;
  slider.minimum = 0;
  slider.maximum = Math.max(0, maxScroll);
  slider.value = 0;
  slider.width = `${width}px`;
  slider.height = `${viewportHeight}px`;
  slider.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  slider.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  slider.isVertical = true;
  slider.background = '#00000000';
  slider.color = '#00000000';
  slider.thumbColor = '#00000000';
  slider.borderColor = '#00000000';
  slider.barOffset = 0;
  slider.thickness = 0;
  slider.isPointerBlocker = true;
  slider.zIndex = 56;
  control.addControl(slider);

  const updateThumbPosition = (value: number): void => {
    const travel = Math.max(0, viewportHeight - thumbHeight);
    const ratio = slider.maximum <= 0 ? 0 : value / slider.maximum;
    thumb.topInPixels = Math.round(travel * ratio);
  };

  const setValue = (nextValue: number): void => {
    const value = clamp(nextValue, 0, slider.maximum);
    if (Math.abs(slider.value - value) > 0.01) {
      slider.value = value;
      return;
    }
    updateThumbPosition(value);
    onScroll(value);
  };

  slider.onValueChangedObservable?.add((value: number) => {
    updateThumbPosition(value);
    onScroll(value);
  });

  updateThumbPosition(0);

  return {
    control,
    setValue,
    getValue: () => slider.value,
    max: () => slider.maximum
  };
}
