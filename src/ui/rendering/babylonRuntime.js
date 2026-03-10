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

  const camera = new BABYLON.FreeCamera('worldBootstrapCamera', new BABYLON.Vector3(0, 8, -10), scene);
  camera.setTarget(new BABYLON.Vector3(0, 0, 0));

  const hemi = new BABYLON.HemisphericLight('worldHemiLight', new BABYLON.Vector3(0, 1, 0), scene);
  hemi.intensity = 0.8;

  const dir = new BABYLON.DirectionalLight('worldDirLight', new BABYLON.Vector3(-1, -2, -1), scene);
  dir.position = new BABYLON.Vector3(6, 10, 6);
  dir.intensity = 0.7;

  let hasLoggedMissingCamera = false;
  engine.runRenderLoop(() => {
    if (!scene.activeCamera) {
      if (!hasLoggedMissingCamera) {
        console.warn('[SillyRPG] Skipping world scene render because no active camera is available yet.');
        hasLoggedMissingCamera = true;
      }
      return;
    }

    hasLoggedMissingCamera = false;
    scene.render();
  });

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

export function resolveOrCreateSceneCamera(runtime, options = {}) {
  const BABYLON = runtime.BABYLON;
  const scene = runtime.scene;
  const preferredCameras = options.preferredCameras ?? [];
  const fallbackPosition = options.fallbackPosition ?? { x: 0, y: 10, z: -12 };
  const fallbackTarget = options.fallbackTarget ?? { x: 0, y: 0, z: 0 };

  const resolveUsableCamera = () => {
    const candidateCameras = [
      ...preferredCameras,
      scene.activeCamera,
      ...(scene.cameras ?? [])
    ];

    for (const candidate of candidateCameras) {
      if (!candidate || candidate.isDisposed?.()) {
        continue;
      }

      return candidate;
    }

    return null;
  };

  let camera = resolveUsableCamera();
  let source = 'imported';
  if (!camera) {
    source = 'fallback';
    camera = new BABYLON.FreeCamera(
      options.fallbackCameraName ?? 'sceneFallbackCamera',
      new BABYLON.Vector3(fallbackPosition.x, fallbackPosition.y, fallbackPosition.z),
      scene
    );
    camera.setTarget(new BABYLON.Vector3(fallbackTarget.x, fallbackTarget.y, fallbackTarget.z));
    camera.minZ = 0.1;
    camera.maxZ = 1000;
  }

  scene.activeCamera = camera;
  runtime.camera = camera;

  console.log('[SillyRPG] Scene camera resolved', {
    source,
    cameraName: camera.name,
    activeCameraName: scene.activeCamera?.name ?? null
  });

  return camera;
}
