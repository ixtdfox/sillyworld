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
    mapLayer.left = `${Math.round(offsetX)}px`;
    mapLayer.top = `${Math.round(offsetY)}px`;
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

  const logMapPosition = () => {
    console.log(`map position x=${Math.round(offsetX)}, y=${Math.round(offsetY)}`);
  };

  mapLayer.onPointerDownObservable.add((pointerCoords) => {
    const pointer = getPointerPosition(pointerCoords);
    if (!pointer) return;
    console.log('map pointer down');
    dragState.isDragging = true;
    dragState.startX = pointer.x;
    dragState.startY = pointer.y;
    dragState.originX = offsetX;
    dragState.originY = offsetY;
    dragState.didDrag = false;
  });

  viewport.onPointerMoveObservable.add((pointerCoords) => {
    if (!dragState.isDragging) return;
    const pointer = getPointerPosition(pointerCoords);
    if (!pointer) return;

    const dx = pointer.x - dragState.startX;
    const dy = pointer.y - dragState.startY;

    if (Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX) {
      if (!dragState.didDrag) {
        console.log('map drag start');
      }
      dragState.didDrag = true;
    }

    offsetX = clamp(dragState.originX + dx, xBounds.min, xBounds.max);
    offsetY = clamp(dragState.originY + dy, yBounds.min, yBounds.max);
    applyMapOffset();

    if (dragState.didDrag) {
      console.log(`map drag move dx=${Math.round(dx)}, dy=${Math.round(dy)}`);
      logMapPosition();
    }
  });

  const endDrag = () => {
    if (!dragState.isDragging) return;
    console.log('map drag end');
    if (dragState.didDrag) {
      suppressPinClicksUntil = Date.now() + CLICK_SUPPRESSION_MS;
    }
    dragState.isDragging = false;
    offsetX = clamp(offsetX, xBounds.min, xBounds.max);
    offsetY = clamp(offsetY, yBounds.min, yBounds.max);
    applyMapOffset();
    logMapPosition();
  };

  viewport.onPointerUpObservable.add(endDrag);
  viewport.onPointerOutObservable.add(() => {
    if (dragState.isDragging) {
      endDrag();
    }
  });

  viewport.addControl(mapLayer);
  return viewport;
}
