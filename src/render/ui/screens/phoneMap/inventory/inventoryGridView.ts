import { createAtlasImage } from '../../../components/interactiveAtlasButton.ts';
import type { BabylonGuiLike, GuiControlLike } from '../worldMapViewport.ts';
import { INVENTORY_LAYOUT, INVENTORY_SLOT_REGION, getInventoryLayoutMetrics } from './inventoryConfig.ts';
import { createInventoryScrollbar } from './inventoryScrollbar.ts';

/** Определяет контракт `PhoneScale` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/inventory/inventoryGridView`. */
interface PhoneScale {
  x: (value: number) => number;
  y: (value: number) => number;
  w: (value: number) => number;
  h: (value: number) => number;
}

/** Определяет контракт `InventoryGridViewProps` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/inventory/inventoryGridView`. */
export interface InventoryGridViewProps {
  GUI: BabylonGuiLike;
  textureUrl: string;
  scale: PhoneScale;
  viewportWidth: number;
  viewportHeight: number;
}

/** Определяет контракт `InventoryCell` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/inventory/inventoryGridView`. */
interface InventoryCell {
  row: number;
  col: number;
  index: number;
}

/** Выполняет `clamp` в ходе выполнения связанного игрового сценария. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Выполняет `isCellVisible` в ходе выполнения связанного игрового сценария. */
function isCellVisible({ row, metrics, scrollOffset, viewportHeight }: { row: number; metrics: ReturnType<typeof getInventoryLayoutMetrics>; scrollOffset: number; viewportHeight: number }): boolean {
  const top = metrics.originY + (row * metrics.slotHeight) - scrollOffset;
  const bottom = top + metrics.slotHeight;
  return bottom > 0 && top < viewportHeight;
}

/** Создаёт и настраивает `createInventoryGridView` в ходе выполнения связанного игрового сценария. */
export function createInventoryGridView({ GUI, textureUrl, scale, viewportWidth, viewportHeight }: InventoryGridViewProps): GuiControlLike {
  const metrics = getInventoryLayoutMetrics(scale);

  const root = new GUI.Rectangle('inventory-screen-root');
  root.width = `${viewportWidth}px`;
  root.height = `${viewportHeight}px`;
  root.thickness = 0;
  root.background = '#151A25';
  root.clipChildren = true;
  root.isPointerBlocker = true;
  root.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  root.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

  const gridLayer = new GUI.Rectangle('inventory-grid-layer');
  gridLayer.width = `${metrics.contentWidth}px`;
  gridLayer.height = `${metrics.contentHeight}px`;
  gridLayer.left = `${metrics.originX}px`;
  gridLayer.top = `${metrics.originY}px`;
  gridLayer.thickness = 0;
  gridLayer.background = 'transparent';
  gridLayer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  gridLayer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  gridLayer.isPointerBlocker = false;

  for (let row = 0; row < INVENTORY_LAYOUT.rows; row += 1) {
    for (let col = 0; col < INVENTORY_LAYOUT.columns; col += 1) {
      const slot = createAtlasImage({ GUI, textureUrl, region: INVENTORY_SLOT_REGION, width: metrics.slotWidth, height: metrics.slotHeight, left: col * metrics.slotWidth, top: row * metrics.slotHeight });
      slot.isPointerBlocker = false;
      slot.isHitTestVisible = false;
      gridLayer.addControl(slot);
    }
  }

  const highlight = new GUI.Rectangle('inventory-selected-slot-highlight');
  highlight.width = `${Math.max(1, metrics.slotWidth - 4)}px`;
  highlight.height = `${Math.max(1, metrics.slotHeight - 4)}px`;
  highlight.thickness = 4;
  highlight.color = '#FFD24A';
  highlight.background = '#00000000';
  highlight.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  highlight.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  highlight.isVisible = false;
  highlight.isPointerBlocker = false;
  gridLayer.addControl(highlight);

  const contextMenu = new GUI.Rectangle('inventory-context-menu');
  contextMenu.width = `${scale.w(INVENTORY_LAYOUT.contextMenuWidth)}px`;
  contextMenu.height = `${scale.h(INVENTORY_LAYOUT.contextMenuHeight)}px`;
  contextMenu.thickness = 2;
  contextMenu.color = '#AAB1BC';
  contextMenu.background = '#12161E';
  contextMenu.cornerRadius = 6;
  contextMenu.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  contextMenu.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  contextMenu.isVisible = false;
  contextMenu.zIndex = 60;

  const dropLabel = new GUI.TextBlock('inventory-context-menu-drop', 'Drop');
  dropLabel.color = '#F4F6F8';
  dropLabel.fontSize = Math.max(14, scale.h(18));
  dropLabel.fontWeight = 'bold';
  contextMenu.addControl(dropLabel);

  const pointerLayer = new GUI.Rectangle('inventory-pointer-layer');
  pointerLayer.width = `${viewportWidth}px`;
  pointerLayer.height = `${viewportHeight}px`;
  pointerLayer.thickness = 0;
  pointerLayer.background = '#00000001';
  pointerLayer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  pointerLayer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  pointerLayer.isPointerBlocker = true;
  pointerLayer.zIndex = 50;

  const maxScroll = Math.max(0, metrics.contentHeight - metrics.visibleHeight);
  let scrollOffset = 0;
  let selectedIndex: number | null = null;
  let isMenuVisible = false;

  const updateSelectionPresentation = (): void => {
    if (selectedIndex === null) {
      highlight.isVisible = false;
      contextMenu.isVisible = false;
      return;
    }

    const row = Math.floor(selectedIndex / INVENTORY_LAYOUT.columns);
    const col = selectedIndex % INVENTORY_LAYOUT.columns;

    highlight.leftInPixels = (col * metrics.slotWidth) + 2;
    highlight.topInPixels = (row * metrics.slotHeight) + 2;
    highlight.isVisible = true;

    const visible = isCellVisible({ row, metrics, scrollOffset, viewportHeight });
    if (!visible || !isMenuVisible) {
      contextMenu.isVisible = false;
      return;
    }

    contextMenu.leftInPixels = Math.round(clamp(metrics.originX + ((col + 1) * metrics.slotWidth) + scale.w(INVENTORY_LAYOUT.contextMenuOffsetX), 0, viewportWidth - scale.w(INVENTORY_LAYOUT.contextMenuWidth)));
    contextMenu.topInPixels = Math.round(clamp(metrics.originY + (row * metrics.slotHeight) - scrollOffset + scale.h(INVENTORY_LAYOUT.contextMenuOffsetY), 0, viewportHeight - scale.h(INVENTORY_LAYOUT.contextMenuHeight)));
    contextMenu.isVisible = true;
  };

  const scrollbar = createInventoryScrollbar({
    GUI,
    viewportHeight: metrics.visibleHeight,
    top: metrics.originY,
    left: metrics.scrollbarLeft,
    width: metrics.scrollbarWidth,
    maxScroll,
    onScroll: (value) => {
      scrollOffset = clamp(value, 0, maxScroll);
      gridLayer.topInPixels = Math.round(metrics.originY - scrollOffset);
      updateSelectionPresentation();
      console.log(`inventory scrollOffset=${Math.round(scrollOffset)}`);
    }
  });

  const getCellFromPointer = (pointerCoords: { x?: number; y?: number } | undefined): InventoryCell | null => {
    const pointerX = pointerCoords?.x;
    const pointerY = pointerCoords?.y;
    if (typeof pointerX !== 'number' || typeof pointerY !== 'number') return null;

    const bounds = pointerLayer._currentMeasure;
    if (!bounds) return null;

    const localX = pointerX - bounds.left;
    const localY = pointerY - bounds.top;

    const insideGridX = localX >= metrics.originX && localX < metrics.originX + metrics.contentWidth;
    const insideGridY = localY >= metrics.originY && localY < metrics.originY + metrics.visibleHeight;
    if (!insideGridX || !insideGridY) return null;

    const contentX = localX - metrics.originX;
    const contentY = localY - metrics.originY + scrollOffset;
    if (contentY < 0 || contentY >= metrics.contentHeight) return null;

    const col = Math.floor(contentX / metrics.slotWidth);
    const row = Math.floor(contentY / metrics.slotHeight);
    if (col < 0 || col >= INVENTORY_LAYOUT.columns || row < 0 || row >= INVENTORY_LAYOUT.rows) return null;

    return { col, row, index: row * INVENTORY_LAYOUT.columns + col };
  };

  const clearSelection = (): void => {
    selectedIndex = null;
    isMenuVisible = false;
    updateSelectionPresentation();
  };

  pointerLayer.onPointerClickObservable.add((pointerCoords) => {
    const cell = getCellFromPointer(pointerCoords);
    if (!cell) {
      clearSelection();
      return;
    }

    if (selectedIndex !== null && selectedIndex !== cell.index) isMenuVisible = false;

    if (selectedIndex === cell.index) {
      isMenuVisible = !isMenuVisible;
      updateSelectionPresentation();
      return;
    }

    selectedIndex = cell.index;
    isMenuVisible = true;
    updateSelectionPresentation();
  });

  pointerLayer.onWheelObservable?.add((wheelInfo) => {
    const delta = wheelInfo.y;
    if (typeof delta !== 'number' || Number.isNaN(delta)) return;
    scrollbar.setValue(scrollOffset + (delta > 0 ? metrics.slotHeight / 3 : -metrics.slotHeight / 3));
  });

  contextMenu.onPointerClickObservable.add(() => {
    if (selectedIndex === null) return;
    console.log('Drop item from slot', selectedIndex);
  });

  root.addControl(gridLayer);
  root.addControl(scrollbar.control);
  root.addControl(pointerLayer);
  root.addControl(contextMenu);

  return root;
}
