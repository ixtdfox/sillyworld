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

function createRegionPin({
  GUI,
  region,
  onRegionOpen,
  suppressPinClickUntilRef,
  isDraggingRef,
  onSuppressionEnd
}) {
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

    if (typeof onSuppressionEnd === 'function') {
      onSuppressionEnd(now);
    }

    console.log(`pin click allowed for regionId=${region.regionId}`);
    console.log(`pin click: ${region.regionId}`);
    onRegionOpen(region.regionId, region.label);
  });

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
  mapImage.isPointerBlocker = true;
  mapImage.stretch = GUI.Image.STRETCH_FILL;
  mapLayer.addControl(mapImage);

  const suppressPinClickUntilRef = { value: 0 };
  const suppressionLoggedRef = { value: false };
  const isDraggingRef = { value: false };

  const maybeLogSuppressionEnd = (now = Date.now()) => {
    if (!suppressionLoggedRef.value) return;
    if (now < suppressPinClickUntilRef.value) return;
    suppressionLoggedRef.value = false;
    console.log(`pin click suppression end at=${now}`);
  };

  const openRegion = (regionId, regionLabel) => {
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

  const applyMapOffset = () => {
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

  mapImage.onPointerDownObservable.add((pointerCoords) => {
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

  mapImage.onPointerMoveObservable.add((pointerCoords) => {
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

  const endDrag = (pointerCoords) => {
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

  mapImage.onPointerUpObservable.add((pointerCoords) => {
    endDrag(pointerCoords);
  });
  mapImage.onPointerOutObservable.add((pointerCoords) => {
    endDrag(pointerCoords);
  });

  viewport.addControl(mapLayer);
  return viewport;
}

//c: x:333, y:0 s: x:133, y:135
//start: x:1060, y:160
