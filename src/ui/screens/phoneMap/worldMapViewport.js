const MAP_NATIVE_SIZE = Object.freeze({ width: 1536, height: 1024 });
const PIN_SIZE = 24;
const DRAG_THRESHOLD_PX = 5;
const CLICK_SUPPRESSION_MS = 120;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getCenteredOffset(viewportSize, contentSize) {
  return Math.round((viewportSize - contentSize) / 2);
}

function getClampBounds(viewportSize, contentSize) {
  if (contentSize <= viewportSize) {
    const centered = getCenteredOffset(viewportSize, contentSize);
    return { min: centered, max: centered };
  }

  return { min: viewportSize - contentSize, max: 0 };
}

function createRegionPin({ GUI, region, onRegionOpen }) {
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

  const label = new GUI.TextBlock(`map-pin-label-${region.regionId}`, region.label);
  label.color = '#FFF';
  label.fontSize = 16;
  label.fontWeight = 'bold';
  label.top = '-28px';
  pin.addControl(label);

  pin.onPointerClickObservable.add(() => onRegionOpen(region.regionId));
  return pin;
}

function getPointerPosition(pointerInfo) {
  if (!pointerInfo) return null;
  if (typeof pointerInfo.x === 'number' && typeof pointerInfo.y === 'number') {
    return { x: pointerInfo.x, y: pointerInfo.y };
  }

  if (pointerInfo.event && typeof pointerInfo.event.clientX === 'number' && typeof pointerInfo.event.clientY === 'number') {
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
}) {
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

  const dragSurface = GUI.Button.CreateSimpleButton('phone-map-drag-surface', '');
  dragSurface.width = `${viewportWidth}px`;
  dragSurface.height = `${viewportHeight}px`;
  dragSurface.thickness = 0;
  dragSurface.background = 'transparent';
  dragSurface.alpha = 0.01;
  dragSurface.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  dragSurface.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  dragSurface.isPointerBlocker = true;
  dragSurface.zIndex = 10;

  const mapImage = new GUI.Image('phone-world-map-image', mapTextureUrl);
  mapImage.width = `${MAP_NATIVE_SIZE.width}px`;
  mapImage.height = `${MAP_NATIVE_SIZE.height}px`;
  mapImage.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  mapImage.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  mapImage.isPointerBlocker = false;
  mapImage.stretch = GUI.Image.STRETCH_FILL;
  mapLayer.addControl(mapImage);

  let suppressPinClicksUntil = 0;
  const openRegion = (regionId) => {
    if (Date.now() < suppressPinClicksUntil) return;
    onRegionOpen(regionId);
  };

  for (const region of regions) {
    mapLayer.addControl(createRegionPin({ GUI, region, onRegionOpen: openRegion }));
  }

  const xBounds = getClampBounds(viewportWidth, MAP_NATIVE_SIZE.width);
  const yBounds = getClampBounds(viewportHeight, MAP_NATIVE_SIZE.height);

  let offsetX = clamp(getCenteredOffset(viewportWidth, MAP_NATIVE_SIZE.width), xBounds.min, xBounds.max);
  let offsetY = clamp(getCenteredOffset(viewportHeight, MAP_NATIVE_SIZE.height), yBounds.min, yBounds.max);

  const applyMapOffset = () => {
    mapLayer.floatLeft = offsetX;
    mapLayer.floatTop = offsetY;
    mapLayer.left = `${Math.round(mapLayer.floatLeft)}px`;
    mapLayer.top = `${Math.round(mapLayer.floatTop)}px`;
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

  const pinsByRegion = regions.map((region) => ({
    regionId: region.regionId,
    centerX: region.x,
    centerY: region.y,
    radius: PIN_SIZE / 2
  }));

  const getControlName = (pointerCoords) => pointerCoords?.currentTarget?.name || dragSurface.name;

  const logPointer = (phase, pointerCoords) => {
    const pointer = getPointerPosition(pointerCoords);
    const details = pointer ? `x=${Math.round(pointer.x)}, y=${Math.round(pointer.y)}` : 'x=unknown, y=unknown';
    console.log(`[world-map] ${phase} on=${getControlName(pointerCoords)} ${details}`);
    return pointer;
  };

  const getRegionIdAtPointer = (pointer) => {
    if (!pointer) return null;
    const mapX = pointer.x - offsetX;
    const mapY = pointer.y - offsetY;
    for (let index = pinsByRegion.length - 1; index >= 0; index -= 1) {
      const pin = pinsByRegion[index];
      const dx = mapX - pin.centerX;
      const dy = mapY - pin.centerY;
      if ((dx * dx) + (dy * dy) <= (pin.radius * pin.radius)) {
        return pin.regionId;
      }
    }
    return null;
  };

  dragSurface.onPointerDownObservable.add((pointerCoords) => {
    const pointer = logPointer('pointer down', pointerCoords);
    if (!pointer) return;
    dragState.isDragging = true;
    dragState.startX = pointer.x;
    dragState.startY = pointer.y;
    dragState.originX = offsetX;
    dragState.originY = offsetY;
    dragState.didDrag = false;
  });

  dragSurface.onPointerMoveObservable.add((pointerCoords) => {
    const pointer = logPointer('pointer move', pointerCoords);
    if (!dragState.isDragging) return;
    if (!pointer) return;

    const dx = pointer.x - dragState.startX;
    const dy = pointer.y - dragState.startY;

    if (Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX) {
      if (!dragState.didDrag) {
        console.log(`[world-map] drag start on=${getControlName(pointerCoords)} startX=${Math.round(dragState.startX)}, startY=${Math.round(dragState.startY)}`);
      }
      dragState.didDrag = true;
    }

    offsetX = clamp(dragState.originX + dx, xBounds.min, xBounds.max);
    offsetY = clamp(dragState.originY + dy, yBounds.min, yBounds.max);
    applyMapOffset();

    if (dragState.didDrag) {
      console.log(`[world-map] drag move on=${getControlName(pointerCoords)} dx=${Math.round(dx)}, dy=${Math.round(dy)}`);
      console.log(`[world-map] drag offsets x=${Math.round(offsetX)}, y=${Math.round(offsetY)}`);
    }
  });

  const endDrag = (pointerCoords, reason) => {
    if (!dragState.isDragging) return;
    console.log(`[world-map] ${reason} on=${getControlName(pointerCoords)}`);
    const pointer = getPointerPosition(pointerCoords);
    if (dragState.didDrag) {
      suppressPinClicksUntil = Date.now() + CLICK_SUPPRESSION_MS;
      console.log(`[world-map] drag end suppressed pin clicks until=${suppressPinClicksUntil}`);
    } else {
      const regionId = getRegionIdAtPointer(pointer);
      if (regionId && Date.now() >= suppressPinClicksUntil) {
        console.log(`[world-map] pin click resolved from drag surface region=${regionId}`);
        onRegionOpen(regionId);
      }
    }
    dragState.isDragging = false;
    offsetX = clamp(offsetX, xBounds.min, xBounds.max);
    offsetY = clamp(offsetY, yBounds.min, yBounds.max);
    applyMapOffset();
    console.log(`[world-map] drag end offsets x=${Math.round(offsetX)}, y=${Math.round(offsetY)}`);
  };

  dragSurface.onPointerUpObservable.add((pointerCoords) => {
    logPointer('pointer up', pointerCoords);
    endDrag(pointerCoords, 'drag end');
  });
  dragSurface.onPointerOutObservable.add((pointerCoords) => {
    logPointer('pointer out', pointerCoords);
    endDrag(pointerCoords, 'drag out');
  });

  viewport.addControl(mapLayer);
  viewport.addControl(dragSurface);
  return viewport;
}
