/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи.
 */
import { resolveCatalogAssetPath } from '../../../../platform/browser/assetResolver.ts';
import type { RegionId } from '../../../../shared/types.ts';
import { createAtlasImage, createInteractiveAtlasButton } from '../../components/interactiveAtlasButton.ts';
import { createBabylonUiRuntime, ensureBabylonRuntime } from '../../../../scene/babylonRuntime.ts';
import { Screen } from '../screenSystem.ts';
import { PHONE_DISPLAY_BOUNDS } from './phoneDisplayLayout.ts';
import { PHONE_UI_ATLAS } from './phoneSpriteAtlas.ts';
import { createInventoryScreen } from './inventory/inventoryScreen.ts';
import { type BabylonGuiLike, type GuiControlLike, createWorldMapViewport } from './worldMapViewport.ts';
import { WORLD_MAP_REGIONS } from './worldMapRegions.ts';

const SCREEN_SIZE = Object.freeze({ width: 1280, height: 920 });
const PHONE_SIZE = Object.freeze({ width: 555, height: 918, scale: 0.78 });

/** Определяет контракт `PhoneScaler` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/phoneCityMapScreen`. */
interface PhoneScaler {
  x: (value: number) => number;
  y: (value: number) => number;
  w: (value: number) => number;
  h: (value: number) => number;
}

/** Определяет контракт `PhoneDisplayController` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/phoneCityMapScreen`. */
interface PhoneDisplayController {
  displayArea: GuiControlLike;
  openMap: () => void;
  openInventory: () => void;
}

/** Определяет контракт `PhoneButtonCallbacks` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/phoneCityMapScreen`. */
interface PhoneButtonCallbacks {
  map: () => void;
  log: () => void;
  msg: () => void;
  inv: () => void;
  acceptCall: () => void;
  endCall: () => void;
}

/** Определяет контракт `MountPhoneSceneOptions` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/phoneCityMapScreen`. */
interface MountPhoneSceneOptions {
  onRegionOpen: (regionId: RegionId) => void;
}

/** Определяет контракт `PhoneCityMapScreenProps` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/phoneCityMapScreen`. */
export interface PhoneCityMapScreenProps {
  onRegionOpen?: (regionId: RegionId) => void;
}

/** Определяет контракт `PhoneGuiNamespace` для согласованного взаимодействия модулей в контексте `render/ui/screens/phoneMap/phoneCityMapScreen`. */
interface PhoneGuiNamespace extends BabylonGuiLike {
  AdvancedDynamicTexture: {
    CreateFullscreenUI: (name: string, foreground: boolean, scene: unknown) => {
      idealWidth: number;
      idealHeight: number;
      renderAtIdealSize: boolean;
      useSmallestIdeal: boolean;
      addControl: (control: unknown) => void;
      dispose: () => void;
    };
  };
}

/** Создаёт и настраивает `createPhoneScaler` в ходе выполнения связанного игрового сценария. */
function createPhoneScaler(phoneWidth: number, phoneHeight: number): PhoneScaler {
  const scaleX = phoneWidth / PHONE_SIZE.width;
  const scaleY = phoneHeight / PHONE_SIZE.height;

  return {
    x: (value) => Math.round(value * scaleX),
    y: (value) => Math.round(value * scaleY),
    w: (value) => Math.round(value * scaleX),
    h: (value) => Math.round(value * scaleY)
  };
}

/** Создаёт и настраивает `createPhoneDisplayLayer` в ходе выполнения связанного игрового сценария. */
function createPhoneDisplayLayer({ GUI, scale, mapTextureUrl, onRegionOpen }: { GUI: BabylonGuiLike; scale: PhoneScaler; mapTextureUrl: string; onRegionOpen: (regionId: RegionId) => void }): PhoneDisplayController {
  const displayArea = new GUI.Rectangle('phone-display-area');
  displayArea.width = `${scale.w(PHONE_DISPLAY_BOUNDS.width)}px`;
  displayArea.height = `${scale.h(PHONE_DISPLAY_BOUNDS.height)}px`;
  displayArea.left = `${scale.x(PHONE_DISPLAY_BOUNDS.left)}px`;
  displayArea.top = `${scale.y(PHONE_DISPLAY_BOUNDS.top)}px`;
  displayArea.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  displayArea.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  displayArea.thickness = 0;
  displayArea.background = '#10141F';
  displayArea.clipChildren = true;

  const mapViewport = createWorldMapViewport({ GUI, mapTextureUrl, viewportWidth: scale.w(PHONE_DISPLAY_BOUNDS.width), viewportHeight: scale.h(PHONE_DISPLAY_BOUNDS.height), regions: WORLD_MAP_REGIONS, onRegionOpen });
  mapViewport.isVisible = false;
  displayArea.addControl(mapViewport);

  const inventoryViewport = createInventoryScreen({ GUI, textureUrl: resolveCatalogAssetPath('textures.phoneUiAtlas'), scale, viewportWidth: scale.w(PHONE_DISPLAY_BOUNDS.width), viewportHeight: scale.h(PHONE_DISPLAY_BOUNDS.height) });
  inventoryViewport.isVisible = false;
  displayArea.addControl(inventoryViewport);

  const hideAllScreens = (): void => {
    mapViewport.isVisible = false;
    inventoryViewport.isVisible = false;
  };

  return {
    displayArea,
    openMap: () => {
      hideAllScreens();
      mapViewport.isVisible = true;
    },
    openInventory: () => {
      hideAllScreens();
      inventoryViewport.isVisible = true;
    }
  };
}

/** Создаёт и настраивает `createButtonCallbacks` в ходе выполнения связанного игрового сценария. */
function createButtonCallbacks({ phoneDisplay }: { phoneDisplay: PhoneDisplayController }): PhoneButtonCallbacks {
  return {
    map: () => phoneDisplay.openMap(),
    log: () => console.log('LOG clicked'),
    msg: () => console.log('MSG clicked'),
    inv: () => {
      console.log('Open inventory screen');
      phoneDisplay.openInventory();
    },
    acceptCall: () => console.log('CALL_ACCEPT clicked'),
    endCall: () => console.log('CALL_END clicked')
  };
}

/** Собирает `buildPhoneGui` в ходе выполнения связанного игрового сценария. */
function buildPhoneGui({ GUI, textureUrl, mapTextureUrl, onRegionOpen }: { GUI: BabylonGuiLike; textureUrl: string; mapTextureUrl: string; onRegionOpen: (regionId: RegionId) => void }): unknown {
  const uiRoot = new GUI.Rectangle('phone-root');
  uiRoot.width = `${SCREEN_SIZE.width}px`;
  uiRoot.height = `${SCREEN_SIZE.height}px`;
  uiRoot.thickness = 0;
  uiRoot.background = '#FFF';

  const phoneWidth = Math.round(PHONE_SIZE.width * PHONE_SIZE.scale);
  const phoneHeight = Math.round(PHONE_SIZE.height * PHONE_SIZE.scale);
  const scale = createPhoneScaler(phoneWidth, phoneHeight);

  const phoneLayer = new GUI.Rectangle('phone-layer');
  phoneLayer.width = `${phoneWidth}px`;
  phoneLayer.height = `${phoneHeight}px`;
  phoneLayer.thickness = 0;
  phoneLayer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  phoneLayer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  const phoneFrame = createAtlasImage({ GUI, textureUrl, region: PHONE_UI_ATLAS.phoneFrame, width: phoneWidth, height: phoneHeight });
  phoneFrame.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  phoneFrame.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  phoneFrame.isPointerBlocker = false;
  phoneFrame.isHitTestVisible = false;
  phoneFrame.zIndex = 10;

  const phoneDisplay = createPhoneDisplayLayer({ GUI, scale, mapTextureUrl, onRegionOpen });
  phoneDisplay.displayArea.zIndex = 5;

  const callbacks = createButtonCallbacks({ phoneDisplay });
  const menuButtonPlacement: Array<{ id: keyof Pick<PhoneButtonCallbacks, 'map' | 'log' | 'msg' | 'inv'>; top: number }> = [
    { id: 'map', top: 180 },
    { id: 'log', top: 225 },
    { id: 'msg', top: 268 },
    { id: 'inv', top: 309 }
  ];

  for (const entry of menuButtonPlacement) {
    const buttonRegion = PHONE_UI_ATLAS.menuButtons[entry.id];
    const menuButton = createInteractiveAtlasButton({ GUI, textureUrl, normalRegion: buttonRegion.normal, pressedRegion: buttonRegion.pressed, width: scale.w(56), height: scale.h(36), left: scale.x(6), top: scale.y(entry.top), onClick: callbacks[entry.id] });
    menuButton.zIndex = 20;
    phoneLayer.addControl(menuButton);
  }

  const statusLocSig = createAtlasImage({ GUI, textureUrl, region: PHONE_UI_ATLAS.statusStrip.locSig, width: scale.w(218), height: scale.h(40), left: scale.x(58), top: scale.y(689) });
  statusLocSig.zIndex = 30;
  statusLocSig.isPointerBlocker = false;
  statusLocSig.isHitTestVisible = false;

  const statusMoneyTime = createAtlasImage({ GUI, textureUrl, region: PHONE_UI_ATLAS.statusStrip.moneyTime, width: scale.w(228), height: scale.h(40), left: scale.x(274), top: scale.y(690) });
  statusMoneyTime.zIndex = 30;
  statusMoneyTime.isPointerBlocker = false;
  statusMoneyTime.isHitTestVisible = false;

  const greenCallButton = createInteractiveAtlasButton({ GUI, textureUrl, normalRegion: PHONE_UI_ATLAS.callButtons.green.normal, pressedRegion: PHONE_UI_ATLAS.callButtons.green.pressed, width: scale.w(135), height: scale.h(60), left: scale.x(42), top: scale.y(749), onClick: callbacks.acceptCall });
  greenCallButton.zIndex = 40;

  const redCallButton = createInteractiveAtlasButton({ GUI, textureUrl, normalRegion: PHONE_UI_ATLAS.callButtons.red.normal, pressedRegion: PHONE_UI_ATLAS.callButtons.red.pressed, width: scale.w(135), height: scale.h(60), left: scale.x(385), top: scale.y(749), onClick: callbacks.endCall });
  redCallButton.zIndex = 40;

  phoneLayer.addControl(phoneDisplay.displayArea);
  phoneLayer.addControl(phoneFrame);
  phoneLayer.addControl(statusLocSig);
  phoneLayer.addControl(statusMoneyTime);
  phoneLayer.addControl(greenCallButton);
  phoneLayer.addControl(redCallButton);

  uiRoot.addControl(phoneLayer);
  return uiRoot;
}

/** Выполняет `mountPhoneScene` в ходе выполнения связанного игрового сценария. */
async function mountPhoneScene(canvas: HTMLCanvasElement, { onRegionOpen }: MountPhoneSceneOptions): Promise<() => void> {
  await ensureBabylonRuntime();
  const runtime = createBabylonUiRuntime(canvas);
  const GUI = runtime.BABYLON.GUI as PhoneGuiNamespace | undefined;
  if (!GUI) throw new Error('Babylon GUI runtime is unavailable.');

  const textureUrl = resolveCatalogAssetPath('textures.phoneUiAtlas');
  const mapTextureUrl = resolveCatalogAssetPath('textures.cityMap');

  const adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI('phone-city-map-ui', true, runtime.scene);
  adt.idealWidth = SCREEN_SIZE.width;
  adt.idealHeight = SCREEN_SIZE.height;
  adt.renderAtIdealSize = true;
  adt.useSmallestIdeal = true;

  adt.addControl(buildPhoneGui({ GUI, textureUrl, mapTextureUrl, onRegionOpen }));

  return () => {
    adt.dispose();
    runtime.dispose();
  };
}

/** Класс `MapScreen` координирует соответствующий сценарий модуля `render/ui/screens/phoneMap/phoneCityMapScreen` и инкапсулирует связанную логику. */
export class MapScreen extends Screen {
  readonly #props: PhoneCityMapScreenProps;
  #canvas: HTMLCanvasElement | null = null;
  #cleanup: null | (() => void) = null;

  constructor(props: PhoneCityMapScreenProps = {}) {
    super();
    this.#props = props;
  }

  protected createRoot(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'sillyrpg-screen sillyrpg-phone-map-screen';

    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'sillyrpg-babylon-canvas';
    this.#canvas.setAttribute('aria-label', 'City map phone UI');
    wrap.appendChild(this.#canvas);

    return wrap;
  }

  override mount(): void {
    if (!this.#canvas) return;

    mountPhoneScene(this.#canvas, {
      onRegionOpen: typeof this.#props.onRegionOpen === 'function' ? this.#props.onRegionOpen : () => {}
    })
      .then((dispose) => {
        this.#cleanup = dispose;
      })
      .catch((error) => {
        console.error('[SillyRPG] Failed to mount Babylon phone UI.', error);
      });
  }

  override unmount(): void {
    if (this.#cleanup) {
      this.#cleanup();
      this.#cleanup = null;
    }
  }

  override dispose(): void {
    super.dispose();
    this.#canvas = null;
  }
}
