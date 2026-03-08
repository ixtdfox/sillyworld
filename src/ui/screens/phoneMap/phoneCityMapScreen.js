import { resolveAsset } from '../../../st_bridge/asset.js';
import { createInteractiveAtlasButton, createAtlasImage } from '../../components/interactiveAtlasButton.js';
import { ensureBabylonRuntime, createBabylonUiRuntime } from '../../rendering/babylonRuntime.js';
import { PHONE_UI_ATLAS } from './phoneSpriteAtlas.js';

const SCREEN_SIZE = Object.freeze({ width: 1280, height: 900 });
const PHONE_SCALE = 0.78;
const PHONE_SIZE = Object.freeze({
  width: Math.round(PHONE_UI_ATLAS.phoneFrame.width * PHONE_SCALE),
  height: Math.round(PHONE_UI_ATLAS.phoneFrame.height * PHONE_SCALE)
});

const LAYOUT = Object.freeze({
  menuButtons: [
    { id: 'map', x: 8, y: 208 },
    { id: 'log', x: 8, y: 263 },
    { id: 'msg', x: 8, y: 318 },
    { id: 'inv', x: 8, y: 372 }
  ],
  statusLocSig: { x: 58, y: 674 },
  statusMoneyTime: { x: 206, y: 674 },
  callAccept: { x: 45, y: 742 },
  callEnd: { x: 339, y: 742 }
});

function scale(value) {
  return Math.round(value * PHONE_SCALE);
}

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

function makeButton({ GUI, textureUrl, atlasEntry, position, onClick, zIndex = 20, name }) {
  const button = createInteractiveAtlasButton({
    GUI,
    textureUrl,
    normalRegion: atlasEntry.normal,
    pressedRegion: atlasEntry.pressed,
    width: scale(atlasEntry.normal.width),
    height: scale(atlasEntry.normal.height),
    left: scale(position.x),
    top: scale(position.y),
    onClick,
    name
  });
  button.zIndex = zIndex;
  return button;
}

function buildPhoneGui({ GUI, textureUrl, callbacks }) {
  const uiRoot = new GUI.Rectangle('phone-root');
  uiRoot.width = `${SCREEN_SIZE.width}px`;
  uiRoot.height = `${SCREEN_SIZE.height}px`;
  uiRoot.thickness = 0;
  uiRoot.isPointerBlocker = false;

  const phoneLayer = new GUI.Rectangle('phone-layer');
  phoneLayer.width = `${PHONE_SIZE.width}px`;
  phoneLayer.height = `${PHONE_SIZE.height}px`;
  phoneLayer.thickness = 0;
  phoneLayer.isPointerBlocker = false;
  phoneLayer.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  phoneLayer.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;

  const phoneFrame = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.phoneFrame,
    width: PHONE_SIZE.width,
    height: PHONE_SIZE.height
  });
  phoneFrame.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
  phoneFrame.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_CENTER;
  phoneFrame.isPointerBlocker = false;
  phoneFrame.zIndex = 5;

  const statusLocSig = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.statusStrip.locSig,
    width: scale(164),
    height: scale(24),
    left: scale(LAYOUT.statusLocSig.x),
    top: scale(LAYOUT.statusLocSig.y)
  });
  statusLocSig.isPointerBlocker = false;
  statusLocSig.zIndex = 10;

  const statusMoneyTime = createAtlasImage({
    GUI,
    textureUrl,
    region: PHONE_UI_ATLAS.statusStrip.moneyTime,
    width: scale(266),
    height: scale(24),
    left: scale(LAYOUT.statusMoneyTime.x),
    top: scale(LAYOUT.statusMoneyTime.y)
  });
  statusMoneyTime.isPointerBlocker = false;
  statusMoneyTime.zIndex = 10;

  phoneLayer.addControl(phoneFrame);
  phoneLayer.addControl(statusLocSig);
  phoneLayer.addControl(statusMoneyTime);

  for (const entry of LAYOUT.menuButtons) {
    const buttonRegion = PHONE_UI_ATLAS.menuButtons[entry.id];
    const menuButton = makeButton({
      GUI,
      textureUrl,
      atlasEntry: buttonRegion,
      position: { x: entry.x, y: entry.y },
      onClick: callbacks[entry.id],
      zIndex: 30,
      name: `menu-${entry.id}`
    });
    phoneLayer.addControl(menuButton);
  }

  const greenCallButton = makeButton({
    GUI,
    textureUrl,
    atlasEntry: PHONE_UI_ATLAS.callButtons.green,
    position: LAYOUT.callAccept,
    onClick: callbacks.acceptCall,
    zIndex: 30,
    name: 'call-accept'
  });

  const redCallButton = makeButton({
    GUI,
    textureUrl,
    atlasEntry: PHONE_UI_ATLAS.callButtons.red,
    position: LAYOUT.callEnd,
    onClick: callbacks.endCall,
    zIndex: 30,
    name: 'call-end'
  });

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
