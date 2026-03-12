import type { RegionId } from '../../../shared/types.js';

const MAP_NATIVE_SIZE = Object.freeze({ width: 1536, height: 1024 });
const PIN_SIZE = 24;
const DRAG_THRESHOLD_PX = 5;
const CLICK_SUPPRESSION_MS = 120;

type NumberRef = { value: number };
type BooleanRef = { value: boolean };

interface PointerPosition {
  x: number;
  y: number;
}

interface PointerInfo {
  x?: number;
  y?: number;
  event?: {
    clientX?: number;
    clientY?: number;
  };
}

export interface WorldMapRegion {
  regionId: RegionId;
  label: string;
  x: number;
  y: number;
}

export interface WorldMapViewportProps {
  GUI: BabylonGuiLike;
  mapTextureUrl: string;
  viewportWidth: number;
  viewportHeight: number;
  regions: readonly WorldMapRegion[];
  onRegionOpen: (regionId: RegionId) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCenteredOffset(viewportSize: number, contentSize: number): number {
  return Math.round((viewportSize - contentSize) / 2);
}

function getClampBounds(viewportSize: number, contentSize: number): { min: number; max: number } {
  if (contentSize <= viewportSize) {
    const centered = getCenteredOffset(viewportSize, contentSize);
    return { min: centered, max: centered };
  }

  return { min: viewportSize - contentSize, max: 0 };
}

interface RegionPinProps {
  GUI: BabylonGuiLike;
  region: WorldMapRegion;
  onRegionOpen: (regionId: RegionId, regionLabel: string) => void;
  suppressPinClickUntilRef: NumberRef;
  isDraggingRef: BooleanRef;
  onSuppressionEnd: (now?: number) => void;
}

function createRegionPin({
  GUI,
  region,
  onRegionOpen,
  suppressPinClickUntilRef,
  isDraggingRef,
  onSuppressionEnd
}: RegionPinProps): GuiControlLike {
  const pin = new GUI.Ellipse(`map-pin-${region.regionId}`);
  pin.width = `${PIN_SIZE}px`;
  pin.height = `${PIN_SIZE}px`;
  pin.thickness = 3;
  pin.color = '#0F2A33';
  pin.background = '#FFD24A';
  pin.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  pin.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  pin.left = `${Math.round(region.x - PIN_SIZE / 2)}px`;
  pin.top = `${Math.round(region.y - PIN_SIZE / 2)}px`;
  pin.isPointerBlocker = true;
  pin.zIndex = 20;

  const label = new GUI.TextBlock(`map-pin-label-${region.regionId}`, region.label);
  label.color = '#FFF';
  label.fontSize = 16;
  label.fontWeight = 'bold';
  label.top = '-28px';
  pin.addControl(label);

  pin.onPointerDownObservable.add(() => {
    console.log(`pin pointer down: ${region.regionId}`);
  });

  pin.onPointerUpObservable.add(() => {
    console.log(`pin pointer up: ${region.regionId}`);
  });

  pin.onPointerClickObservable.add(() => {
    const now = Date.now();
    if (isDraggingRef.value || now < suppressPinClickUntilRef.value) {
      console.log(`pin click suppressed for regionId=${region.regionId}`);
      return;
    }

    onSuppressionEnd(now);

    console.log(`pin click allowed for regionId=${region.regionId}`);
    console.log(`pin click: ${region.regionId}`);
    onRegionOpen(region.regionId, region.label);
  });

  return pin;
}

function getPointerPosition(pointerInfo?: PointerInfo): PointerPosition | null {
  if (!pointerInfo) return null;
  if (typeof pointerInfo.x === 'number' && typeof pointerInfo.y === 'number') {
    return { x: pointerInfo.x, y: pointerInfo.y };
  }

  if (typeof pointerInfo.event?.clientX === 'number' && typeof pointerInfo.event?.clientY === 'number') {
    return { x: pointerInfo.event.clientX, y: pointerInfo.event.clientY };
  }

  return null;
}

export function createWorldMapViewport({
  GUI,
  mapTextureUrl,
  viewportWidth,
  viewportHeight,
  regions,
  onRegionOpen
}: WorldMapViewportProps): GuiRectangleLike {
  const viewport = new GUI.Rectangle('phone-map-viewport');
  viewport.width = `${viewportWidth}px`;
  viewport.height = `${viewportHeight}px`;
  viewport.thickness = 0;
  viewport.background = '#1E2430';
  viewport.clipChildren = true;
  viewport.isPointerBlocker = true;
  viewport.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  viewport.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

  const mapLayer = new GUI.Rectangle('phone-map-layer');
  mapLayer.width = `${MAP_NATIVE_SIZE.width}px`;
  mapLayer.height = `${MAP_NATIVE_SIZE.height}px`;
  mapLayer.thickness = 0;
  mapLayer.background = 'transparent';
  mapLayer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  mapLayer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  mapLayer.isPointerBlocker = true;

  const mapImage = new GUI.Image('phone-world-map-image', mapTextureUrl);
  mapImage.width = `${MAP_NATIVE_SIZE.width}px`;
  mapImage.height = `${MAP_NATIVE_SIZE.height}px`;
  mapImage.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  mapImage.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  mapImage.isPointerBlocker = true;
  mapImage.stretch = GUI.Image.STRETCH_FILL;
  mapLayer.addControl(mapImage);

  const suppressPinClickUntilRef: NumberRef = { value: 0 };
  const suppressionLoggedRef: BooleanRef = { value: false };
  const isDraggingRef: BooleanRef = { value: false };

  const maybeLogSuppressionEnd = (now = Date.now()): void => {
    if (!suppressionLoggedRef.value) return;
    if (now < suppressPinClickUntilRef.value) return;
    suppressionLoggedRef.value = false;
    console.log(`pin click suppression end at=${now}`);
  };

  const openRegion = (regionId: RegionId, regionLabel: string): void => {
    const now = Date.now();
    if (now < suppressPinClickUntilRef.value) {
      console.log(`pin click suppressed for regionId=${regionId}`);
      return;
    }
    maybeLogSuppressionEnd(now);
    console.log(`selected pin: ${regionId}${regionLabel ? ` (${regionLabel})` : ''}`);
    onRegionOpen(regionId);
  };

  for (const region of regions) {
    mapLayer.addControl(createRegionPin({
      GUI,
      region,
      onRegionOpen: openRegion,
      suppressPinClickUntilRef,
      isDraggingRef,
      onSuppressionEnd: maybeLogSuppressionEnd
    }));
  }

  const xBounds = getClampBounds(viewportWidth, MAP_NATIVE_SIZE.width);
  const yBounds = getClampBounds(viewportHeight, MAP_NATIVE_SIZE.height);

  let offsetX = clamp(getCenteredOffset(viewportWidth, MAP_NATIVE_SIZE.width), xBounds.min, xBounds.max);
  let offsetY = clamp(getCenteredOffset(viewportHeight, MAP_NATIVE_SIZE.height), yBounds.min, yBounds.max);

  const applyMapOffset = (): void => {
    mapLayer.leftInPixels = Math.round(offsetX);
    mapLayer.topInPixels = Math.round(offsetY);
  };
  applyMapOffset();

  const dragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    didDrag: false
  };

  mapImage.onPointerDownObservable.add((pointerCoords: PointerInfo) => {
    const pointer = getPointerPosition(pointerCoords);
    if (!pointer) return;
    dragState.isDragging = true;
    isDraggingRef.value = false;
    dragState.startX = pointer.x;
    dragState.startY = pointer.y;
    dragState.originX = offsetX;
    dragState.originY = offsetY;
    dragState.didDrag = false;
  });

  mapImage.onPointerMoveObservable.add((pointerCoords: PointerInfo) => {
    const pointer = getPointerPosition(pointerCoords);
    if (!dragState.isDragging) return;
    if (!pointer) return;

    const dx = pointer.x - dragState.startX;
    const dy = pointer.y - dragState.startY;

    if (Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX) {
      dragState.didDrag = true;
      isDraggingRef.value = true;
    }

    offsetX = clamp(dragState.originX + dx, xBounds.min, xBounds.max);
    offsetY = clamp(dragState.originY + dy, yBounds.min, yBounds.max);
    applyMapOffset();
  });

  const endDrag = (): void => {
    if (!dragState.isDragging) return;
    if (dragState.didDrag) {
      suppressPinClickUntilRef.value = Date.now() + CLICK_SUPPRESSION_MS;
      suppressionLoggedRef.value = true;
      console.log(`pin click suppression start until=${suppressPinClickUntilRef.value}`);
    } else {
      maybeLogSuppressionEnd();
    }

    dragState.isDragging = false;
    isDraggingRef.value = false;
    offsetX = clamp(offsetX, xBounds.min, xBounds.max);
    offsetY = clamp(offsetY, yBounds.min, yBounds.max);
    applyMapOffset();
  };

  mapImage.onPointerUpObservable.add((_pointerCoords: PointerInfo) => {
    endDrag();
  });
  mapImage.onPointerOutObservable.add((_pointerCoords: PointerInfo) => {
    endDrag();
  });

  viewport.addControl(mapLayer);
  return viewport;
}

interface GuiObservable<T = unknown> {
  add: (callback: (payload: T) => void) => void;
}

export interface GuiControlLike {
  width?: string;
  height?: string;
  thickness?: number;
  color?: string;
  background?: string;
  horizontalAlignment?: number;
  verticalAlignment?: number;
  left?: string;
  top?: string;
  leftInPixels?: number;
  topInPixels?: number;
  isPointerBlocker?: boolean;
  isHitTestVisible?: boolean;
  isVisible?: boolean;
  clipChildren?: boolean;
  zIndex?: number;
  stretch?: number;
  fontSize?: number;
  fontWeight?: string;
  addControl: (control: GuiControlLike) => void;
  onPointerDownObservable: GuiObservable<PointerInfo>;
  onPointerMoveObservable: GuiObservable<PointerInfo>;
  onPointerUpObservable: GuiObservable<PointerInfo>;
  onPointerClickObservable: GuiObservable<PointerInfo>;
  onPointerOutObservable?: GuiObservable<PointerInfo>;
}

export interface GuiRectangleLike extends GuiControlLike {}

export interface BabylonGuiLike {
  Control: {
    HORIZONTAL_ALIGNMENT_LEFT: number;
    HORIZONTAL_ALIGNMENT_TOP?: number;
    HORIZONTAL_ALIGNMENT_CENTER: number;
    VERTICAL_ALIGNMENT_TOP: number;
    VERTICAL_ALIGNMENT_CENTER: number;
  };
  Image: {
    new (name: string, url?: string): GuiControlLike;
    STRETCH_FILL: number;
  };
  Rectangle: new (name: string) => GuiRectangleLike;
  Ellipse: new (name: string) => GuiControlLike;
  TextBlock: new (name: string, text?: string) => GuiControlLike;
}

//c: x:333, y:0 s: x:133, y:135
//start: x:1060, y:160
