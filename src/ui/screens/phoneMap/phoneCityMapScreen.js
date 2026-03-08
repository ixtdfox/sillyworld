import { resolveAsset } from '../../../st_bridge/asset.js';
import { createInteractiveAtlasButton, createAtlasImage } from '../../components/interactiveAtlasButton.js';
import { ensureBabylonRuntime, createBabylonUiRuntime } from '../../rendering/babylonRuntime.js';
import { PHONE_UI_ATLAS } from './phoneSpriteAtlas.js';

const SCREEN_SIZE = Object.freeze({ width: 1280, height: 900 });
const PHONE_SIZE = Object.freeze({ width: 558, height: 950, scale: 0.78 });

function createButtonCallbacks() {
  return {
    map: () => console.log('MAP clicked'),
    log: () => console.log('LOG clicked'),
    msg: () => console.log('MSG clicked'),
    inv: () => console.log('INV clicked'),
    acceptCall: () => console.log('CALL_ACCEPT clicked'),
    endCall: () => console.log('CALL_END clicked')
  };
}

function buildPhoneGui({ GUI, textureUrl, callbacks }) {
  const uiRoot = new GUI.Rectangle('phone-root');
  uiRoot.width = `${SCREEN_SIZE.width}px`;
  uiRoot.height = `${SCREEN_SIZE.height}px`;
  uiRoot.thickness = 0;

  const phoneWidth = Math.round(PHONE_SIZE.width * PHONE_SIZE.scale);
  const phoneHeight = Math.round(PHONE_SIZE.height * PHONE_SIZE.scale);

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
  phoneFrame.zIndex = 10;

  const menuButtonPlacement = [
    { id: 'map', top: 182 },
    { id: 'log', top: 227 },
    { id: 'msg', top: 272 },
    { id: 'inv', top: 317 }
  ];

  const menuButtonWidth = 50;
  const menuButtonHeight = 32;
  const menuLeft = 20;

  const statusLocSig = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.statusStrip.locSig,
    width: 128,
    height: 19,
    left: 44,
    top: 729
  });
  statusLocSig.zIndex = 30;

  const statusMoneyTime = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.statusStrip.moneyTime,
    width: 206,
    height: 19,
    left: 174,
    top: 729
  });
  statusMoneyTime.zIndex = 30;

  for (const entry of menuButtonPlacement) {
    const buttonRegion = PHONE_UI_ATLAS.menuButtons[entry.id];
    const menuButton = createInteractiveAtlasButton({
      GUI,
      textureUrl,
      normalRegion: buttonRegion.normal,
      pressedRegion: buttonRegion.pressed,
      width: menuButtonWidth,
      height: menuButtonHeight,
      left: menuLeft,
      top: entry.top,
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
    width: 132,
    height: 66,
    left: 28,
    top: 797,
    onClick: callbacks.acceptCall
  });
  greenCallButton.zIndex = 20;

  const redCallButton = createInteractiveAtlasButton({
    GUI,
    textureUrl,
    normalRegion: PHONE_UI_ATLAS.callButtons.red.normal,
    pressedRegion: PHONE_UI_ATLAS.callButtons.red.pressed,
    width: 132,
    height: 66,
    left: 399,
    top: 797,
    onClick: callbacks.endCall
  });
  redCallButton.zIndex = 20;

  phoneLayer.addControl(phoneFrame);
  phoneLayer.addControl(statusLocSig);
  phoneLayer.addControl(statusMoneyTime);
  phoneLayer.addControl(greenCallButton);
  phoneLayer.addControl(redCallButton);

  uiRoot.addControl(phoneLayer);
  return uiRoot;
}

async function mountPhoneScene(canvas) {
  await ensureBabylonRuntime();
  const runtime = createBabylonUiRuntime(canvas);
  const GUI = runtime.BABYLON.GUI;
  const callbacks = createButtonCallbacks();
  const textureUrl = resolveAsset('assets/sprites.png');

  const adt = GUI.AdvancedDynamicTexture.CreateFullscreenUI('phone-city-map-ui', true, runtime.scene);
  adt.idealWidth = SCREEN_SIZE.width;
  adt.idealHeight = SCREEN_SIZE.height;
  adt.renderAtIdealSize = true;
  adt.useSmallestIdeal = true;

  const ui = buildPhoneGui({ GUI, textureUrl, callbacks });
  adt.addControl(ui);

  return () => {
    adt.dispose();
    runtime.dispose();
  };
}

export function renderPhoneCityMapScreen() {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-phone-map-screen';

  const canvas = document.createElement('canvas');
  canvas.className = 'sillyrpg-babylon-canvas';
  canvas.setAttribute('aria-label', 'City map phone UI');
  wrap.appendChild(canvas);

  let cleanup = null;

  wrap.__sillyOnMount = () => {
    mountPhoneScene(canvas)
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
