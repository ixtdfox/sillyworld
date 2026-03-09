import { resolveAsset } from '../../../st_bridge/asset.js';
import { createInteractiveAtlasButton, createAtlasImage } from '../../components/interactiveAtlasButton.js';
import { ensureBabylonRuntime, createBabylonUiRuntime } from '../../rendering/babylonRuntime.js';
import { PHONE_UI_ATLAS } from './phoneSpriteAtlas.js';
import { PHONE_DISPLAY_BOUNDS } from './phoneDisplayLayout.js';
import { WORLD_MAP_REGIONS } from './worldMapRegions.js';
import { createWorldMapViewport } from './worldMapViewport.js';
import { createInventoryScreen } from './inventory/inventoryScreen.js';

const SCREEN_SIZE = Object.freeze({ width: 1280, height: 920 });
const PHONE_SIZE = Object.freeze({ width: 555, height: 918, scale: 0.78 });

function createPhoneScaler(phoneWidth, phoneHeight) {
  const scaleX = phoneWidth / PHONE_SIZE.width;
  const scaleY = phoneHeight / PHONE_SIZE.height;

  return {
    x: (value) => Math.round(value * scaleX),
    y: (value) => Math.round(value * scaleY),
    w: (value) => Math.round(value * scaleX),
    h: (value) => Math.round(value * scaleY)
  };
}

function createPhoneDisplayLayer({ GUI, scale, mapTextureUrl, onRegionOpen }) {
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

  const mapViewport = createWorldMapViewport({
    GUI,
    mapTextureUrl,
    viewportWidth: scale.w(PHONE_DISPLAY_BOUNDS.width),
    viewportHeight: scale.h(PHONE_DISPLAY_BOUNDS.height),
    regions: WORLD_MAP_REGIONS,
    onRegionOpen
  });

  mapViewport.isVisible = false;
  displayArea.addControl(mapViewport);

  const inventoryViewport = createInventoryScreen({
    GUI,
    textureUrl: resolveAsset('assets/sprites.png'),
    scale,
    viewportWidth: scale.w(PHONE_DISPLAY_BOUNDS.width),
    viewportHeight: scale.h(PHONE_DISPLAY_BOUNDS.height)
  });
  inventoryViewport.isVisible = false;
  displayArea.addControl(inventoryViewport);

  const hideAllScreens = () => {
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

function createButtonCallbacks({ phoneDisplay }) {
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

function buildPhoneGui({ GUI, textureUrl, mapTextureUrl, onRegionOpen }) {
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

  const phoneFrame = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.phoneFrame,
    width: phoneWidth,
    height: phoneHeight
  });
  phoneFrame.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  phoneFrame.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  phoneFrame.isPointerBlocker = false;
  phoneFrame.isHitTestVisible = false; // <-- важно
  phoneFrame.zIndex = 10;

  const phoneDisplay = createPhoneDisplayLayer({ GUI, scale, mapTextureUrl, onRegionOpen });
  phoneDisplay.displayArea.zIndex = 5;

  const callbacks = createButtonCallbacks({ phoneDisplay });

  const menuButtonPlacement = [
    { id: 'map', top: 180 },
    { id: 'log', top: 225 },
    { id: 'msg', top: 268 },
    { id: 'inv', top: 309 }
  ];

  const menuButtonWidth = 56;
  const menuButtonHeight = 36;
  const menuLeft = 6;

  const statusLocSig = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.statusStrip.locSig,
    width: scale.w(218),
    height: scale.h(40),
    left: scale.x(58),
    top: scale.y(689)
  });
  statusLocSig.zIndex = 30;
  statusLocSig.isPointerBlocker = false;
  statusLocSig.isHitTestVisible = false;

  const statusMoneyTime = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.statusStrip.moneyTime,
    width: scale.w(228),
    height: scale.h(40),
    left: scale.x(274),
    top: scale.y(690)
  });
  statusMoneyTime.zIndex = 30;
  statusMoneyTime.isPointerBlocker = false;
  statusMoneyTime.isHitTestVisible = false;

  for (const entry of menuButtonPlacement) {
    const buttonRegion = PHONE_UI_ATLAS.menuButtons[entry.id];
    const menuButton = createInteractiveAtlasButton({
      GUI,
      textureUrl,
      normalRegion: buttonRegion.normal,
      pressedRegion: buttonRegion.pressed,
      width: scale.w(menuButtonWidth),
      height: scale.h(menuButtonHeight),
      left: scale.x(menuLeft),
      top: scale.y(entry.top),
      onClick: callbacks[entry.id]
    });
    menuButton.zIndex = 20;
    phoneLayer.addControl(menuButton);
  }

  const greenCallButton = createInteractiveAtlasButton({
    GUI,
    textureUrl,
    normalRegion: PHONE_UI_ATLAS.callButtons.green.normal,
    pressedRegion: PHONE_UI_ATLAS.callButtons.green.pressed,
    width: scale.w(135),
    height: scale.h(60),
    left: scale.x(42),
    top: scale.y(749),
    onClick: callbacks.acceptCall
  });
  greenCallButton.zIndex = 40;

  const redCallButton = createInteractiveAtlasButton({
    GUI,
    textureUrl,
    normalRegion: PHONE_UI_ATLAS.callButtons.red.normal,
    pressedRegion: PHONE_UI_ATLAS.callButtons.red.pressed,
    width: scale.w(135),
    height: scale.h(60),
    left: scale.x(385),
    top: scale.y(749),
    onClick: callbacks.endCall
  });
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

async function mountPhoneScene(canvas, { onRegionOpen }) {
  await ensureBabylonRuntime();
  const runtime = createBabylonUiRuntime(canvas);
  const GUI = runtime.BABYLON.GUI;
  const textureUrl = resolveAsset('assets/sprites.png');
  const mapTextureUrl = resolveAsset('assets/map.png');

  const adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI('phone-city-map-ui', true, runtime.scene);
  adt.idealWidth = SCREEN_SIZE.width;
  adt.idealHeight = SCREEN_SIZE.height;
  adt.renderAtIdealSize = true;
  adt.useSmallestIdeal = true;

  const ui = buildPhoneGui({ GUI, textureUrl, mapTextureUrl, onRegionOpen });
  adt.addControl(ui);

  return () => {
    adt.dispose();
    runtime.dispose();
  };
}

export function renderPhoneCityMapScreen({ onRegionOpen } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-phone-map-screen';

  const canvas = document.createElement('canvas');
  canvas.className = 'sillyrpg-babylon-canvas';
  canvas.setAttribute('aria-label', 'City map phone UI');
  wrap.appendChild(canvas);

  let cleanup = null;

  wrap.__sillyOnMount = () => {
    mountPhoneScene(canvas, {
      onRegionOpen: typeof onRegionOpen === 'function' ? onRegionOpen : () => {}
    })
        .then((dispose) => {
          cleanup = dispose;
        })
        .catch((error) => {
          console.error('[SillyRPG] Failed to mount Babylon phone UI.', error);
        });
  };

  wrap.__sillyOnUnmount = () => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  };

  return wrap;
}
