const BABYLON_SCRIPT_SRC = 'https://cdn.babylonjs.com/babylon.js';
const BABYLON_GUI_SCRIPT_SRC = 'https://cdn.babylonjs.com/gui/babylon.gui.min.js';
const BABYLON_LOADERS_SCRIPT_SRC = 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js';

let babylonLoadPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-sillyrpg-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.sillyrpgSrc = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export function ensureBabylonRuntime() {
  if (window.BABYLON && window.BABYLON.GUI) {
    return Promise.resolve(window.BABYLON);
  }

  if (!babylonLoadPromise) {
    babylonLoadPromise = loadScript(BABYLON_SCRIPT_SRC)
      .then(() => loadScript(BABYLON_GUI_SCRIPT_SRC))
      .then(() => loadScript(BABYLON_LOADERS_SCRIPT_SRC))
      .then(() => {
        if (!window.BABYLON || !window.BABYLON.GUI) {
          throw new Error('Babylon runtime loaded but BABYLON.GUI is unavailable.');
        }
        return window.BABYLON;
      });
  }

  return babylonLoadPromise;
}

export function createBabylonUiRuntime(canvas) {
  const BABYLON = window.BABYLON;
  if (!BABYLON) {
    throw new Error('BABYLON global is not available.');
  }

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.02, 0.02, 0.02, 1);

  const camera = new BABYLON.FreeCamera('uiCamera', new BABYLON.Vector3(0, 0, -10), scene);
  camera.setTarget(BABYLON.Vector3.Zero());

  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    BABYLON,
    engine,
    scene,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    }
  };
}

export function createBabylonWorldRuntime(canvas) {
  const BABYLON = window.BABYLON;
  if (!BABYLON) {
    throw new Error('BABYLON global is not available.');
  }

  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    disableWebGL2Support: false
  });

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.04, 0.04, 0.06, 1);

  const camera = new BABYLON.ArcRotateCamera(
    'worldCamera',
    -Math.PI / 2,
    Math.PI / 2.3,
    10,
    new BABYLON.Vector3(0, 0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.wheelDeltaPercentage = 0.01;

  const hemi = new BABYLON.HemisphericLight('worldHemiLight', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;

  const dir = new BABYLON.DirectionalLight('worldDirLight', new BABYLON.Vector3(-1, -2, -1), scene);
  dir.position = new BABYLON.Vector3(6, 10, 6);
  dir.intensity = 0.7;

  engine.runRenderLoop(() => scene.render());

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);

  return {
    BABYLON,
    engine,
    scene,
    camera,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    }
  };
}
