export function createInteractiveAtlasButton({
  GUI,
  textureUrl,
  normalRegion,
  pressedRegion,
  width,
  height,
  left = 0,
  top = 0,
  horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT,
  verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP,
  onClick = () => {},
  name = 'atlas-button'
}) {
  const image = new GUI.Image(name, textureUrl);
  image.width = `${width}px`;
  image.height = `${height}px`;
  image.left = `${left}px`;
  image.top = `${top}px`;
  image.horizontalAlignment = horizontalAlignment;
  image.verticalAlignment = verticalAlignment;
  image.isPointerBlocker = true;
  image.isHitTestVisible = true;
  image.stretch = GUI.Image.STRETCH_NONE;
  image.sourceLeft = normalRegion.x;
  image.sourceTop = normalRegion.y;
  image.sourceWidth = normalRegion.width;
  image.sourceHeight = normalRegion.height;

  const setRegion = (region) => {
    image.sourceLeft = region.x;
    image.sourceTop = region.y;
    image.sourceWidth = region.width;
    image.sourceHeight = region.height;
  };

  image.onPointerDownObservable.add(() => {
    setRegion(pressedRegion || normalRegion);
  });

  const resetToNormal = () => {
    setRegion(normalRegion);
  };

  image.onPointerOutObservable.add(resetToNormal);
  image.onPointerUpObservable.add(resetToNormal);
  image.onPointerClickObservable.add(() => onClick());

  return image;
}

export function createAtlasImage({
  GUI,
  textureUrl,
  region,
  width,
  height,
  left = 0,
  top = 0,
  horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT,
  verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP,
  name = 'atlas-image'
}) {
  const image = new GUI.Image(name, textureUrl);
  image.width = `${width}px`;
  image.height = `${height}px`;
  image.left = `${left}px`;
  image.top = `${top}px`;
  image.horizontalAlignment = horizontalAlignment;
  image.verticalAlignment = verticalAlignment;
  image.stretch = GUI.Image.STRETCH_NONE;
  image.sourceLeft = region.x;
  image.sourceTop = region.y;
  image.sourceWidth = region.width;
  image.sourceHeight = region.height;
  return image;
}
