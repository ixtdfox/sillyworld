import type { BabylonGuiLike, GuiControlLike } from '../screens/phoneMap/worldMapViewport.js';

export interface AtlasRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AtlasImageProps {
  GUI: BabylonGuiLike;
  textureUrl: string;
  region: AtlasRegion;
  width: number;
  height: number;
  left?: number;
  top?: number;
  horizontalAlignment?: number;
  verticalAlignment?: number;
}

interface InteractiveAtlasButtonProps {
  GUI: BabylonGuiLike;
  textureUrl: string;
  normalRegion: AtlasRegion;
  pressedRegion?: AtlasRegion;
  width: number;
  height: number;
  left?: number;
  top?: number;
  horizontalAlignment?: number;
  verticalAlignment?: number;
  onClick?: () => void;
}



function applyRegion(image: GuiControlLike, region: AtlasRegion): void {
  image.sourceLeft = region.x;
  image.sourceTop = region.y;
  image.sourceWidth = region.width;
  image.sourceHeight = region.height;
}

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
  onClick = () => {}
}: InteractiveAtlasButtonProps): GuiControlLike {
  const image = new GUI.Image('atlas-button', textureUrl);
  image.width = `${width}px`;
  image.height = `${height}px`;
  image.left = `${left}px`;
  image.top = `${top}px`;
  image.horizontalAlignment = horizontalAlignment;
  image.verticalAlignment = verticalAlignment;
  image.isPointerBlocker = true;
  image.stretch = GUI.Image.STRETCH_NONE;

  applyRegion(image, normalRegion);

  image.onPointerDownObservable.add(() => {
    applyRegion(image, pressedRegion ?? normalRegion);
  });

  const resetToNormal = (): void => applyRegion(image, normalRegion);

  image.onPointerOutObservable?.add(resetToNormal);
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
  verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP
}: AtlasImageProps): GuiControlLike {
  const image = new GUI.Image('atlas-image', textureUrl);
  image.width = `${width}px`;
  image.height = `${height}px`;
  image.left = `${left}px`;
  image.top = `${top}px`;
  image.horizontalAlignment = horizontalAlignment;
  image.verticalAlignment = verticalAlignment;
  image.stretch = GUI.Image.STRETCH_NONE;
  applyRegion(image, region);
  return image;
}
