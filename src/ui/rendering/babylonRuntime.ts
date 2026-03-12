// @ts-nocheck
const BABYLON_SCRIPT_SRC = '/vendor/babylon/babylon.min.js';
const BABYLON_GUI_SCRIPT_SRC = '/vendor/babylon/babylon.gui.min.js';
const BABYLON_LOADERS_SCRIPT_SRC = '/vendor/babylon/babylonjs.loaders.min.js';

interface PositionLike { x: number; y: number; z: number; }
interface BabylonCameraLike { name?: string; isDisposed?: () => boolean; setTarget?: (target: unknown) => void; minZ?: number; maxZ?: number; }
interface BabylonNamespaceLike {
  GUI?: unknown;
  Engine: new (canvas: HTMLCanvasElement, antialias: boolean, options: Record<string, boolean>) => { resize: () => void; dispose: () => void; runRenderLoop: (cb: () => void) => void };
  Scene: new (engine: unknown) => {
    clearColor?: unknown; activeCamera?: BabylonCameraLike | null; cameras?: BabylonCameraLike[];
    pointerX: number; pointerY: number;
    pick: (x: number, y: number) => { hit?: boolean; pickedMesh?: unknown } | null;
    pickWithRay: (ray: unknown, predicate: (mesh: { isEnabled?: () => boolean; isVisible?: boolean }) => boolean) => { hit?: boolean; pickedPoint?: { y: number } } | null;
    onPointerObservable: { add: (callback: (pointerInfo: { type: number; skipOnPointerObservable?: boolean }) => void) => unknown; remove: (observer: unknown) => void };
    render: () => void; dispose: () => void;
    onBeforeRenderObservable: { add: (callback: () => void) => unknown; remove: (observer: unknown) => void };
  };
  Color4: new (r: number, g: number, b: number, a: number) => unknown;
  FreeCamera: new (name: string, position: unknown, scene: unknown) => BabylonCameraLike;
  Vector3: { new (x: number, y: number, z: number): PositionLike; Zero: () => unknown; Distance: (source: unknown, target: unknown) => number };
  Ray: new (origin: unknown, direction: unknown, length: number) => unknown;
  HemisphericLight: new (name: string, direction: unknown, scene: unknown) => { intensity: number };
  DirectionalLight: new (name: string, direction: unknown, scene: unknown) => { position: unknown; intensity: number };
  PointerEventTypes: { POINTERDOWN: number };
}

declare global { interface Window { BABYLON?: BabylonNamespaceLike; } }

export interface BabylonRuntimeLike { BABYLON: BabylonNamespaceLike; engine: { resize: () => void; dispose: () => void; runRenderLoop: (cb: () => void) => void }; scene: BabylonNamespaceLike['Scene'] extends new (...args: never[]) => infer T ? T : never; camera?: BabylonCameraLike | null; dispose: () => void; }

let babylonLoadPromise: Promise<BabylonNamespaceLike> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-sillyrpg-src="${src}"]`);
    if (existing) {
      if (existing.dataset['loaded'] === 'true') { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset['sillyrpgSrc'] = src;
    script.addEventListener('load', () => { script.dataset['loaded'] = 'true'; resolve(); }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

export function ensureBabylonRuntime(): Promise<BabylonNamespaceLike> {
  if (window.BABYLON?.GUI) return Promise.resolve(window.BABYLON);
  if (!babylonLoadPromise) {
    console.info('[SillyRPG] Loading Babylon runtime from local bundled assets.', {
      core: BABYLON_SCRIPT_SRC,
      gui: BABYLON_GUI_SCRIPT_SRC,
      loaders: BABYLON_LOADERS_SCRIPT_SRC
    });
    babylonLoadPromise = loadScript(BABYLON_SCRIPT_SRC)
      .then(() => loadScript(BABYLON_GUI_SCRIPT_SRC))
      .then(() => loadScript(BABYLON_LOADERS_SCRIPT_SRC))
      .then(() => {
        if (!window.BABYLON?.GUI) throw new Error('Babylon runtime loaded but BABYLON.GUI is unavailable.');
        return window.BABYLON;
      })
      .catch((error) => {
        console.error('[SillyRPG] Babylon runtime bootstrap failed.', {
          error,
          attemptedSources: [BABYLON_SCRIPT_SRC, BABYLON_GUI_SCRIPT_SRC, BABYLON_LOADERS_SCRIPT_SRC]
        });
        throw error;
      });
  }
  return babylonLoadPromise;
}

function requireBabylon(): BabylonNamespaceLike { if (!window.BABYLON) throw new Error('BABYLON global is not available.'); return window.BABYLON; }

function createBaseRuntime(canvas: HTMLCanvasElement, clearColor: [number, number, number, number], cameraName: string, cameraPosition: PositionLike): BabylonRuntimeLike {
  const BABYLON = requireBabylon();
  const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, disableWebGL2Support: false });
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(...clearColor);
  const camera = new BABYLON.FreeCamera(cameraName, new BABYLON.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z), scene);
  engine.runRenderLoop(() => scene.render());
  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);
  return { BABYLON, engine, scene, camera, dispose: () => { window.removeEventListener('resize', onResize); scene.dispose(); engine.dispose(); } };
}

export function createBabylonUiRuntime(canvas: HTMLCanvasElement): BabylonRuntimeLike {
  const runtime = createBaseRuntime(canvas, [0.02, 0.02, 0.02, 1], 'uiCamera', { x: 0, y: 0, z: -10 });
  runtime.camera?.setTarget?.(runtime.BABYLON.Vector3.Zero());
  return runtime;
}

export function createBabylonWorldRuntime(canvas: HTMLCanvasElement): BabylonRuntimeLike {
  const runtime = createBaseRuntime(canvas, [0.04, 0.04, 0.06, 1], 'worldBootstrapCamera', { x: 0, y: 8, z: -10 });
  const BABYLON = runtime.BABYLON;
  runtime.camera?.setTarget?.(new BABYLON.Vector3(0, 0, 0));
  const hemi = new BABYLON.HemisphericLight('worldHemiLight', new BABYLON.Vector3(0, 1, 0), runtime.scene);
  hemi.intensity = 0.8;
  const dir = new BABYLON.DirectionalLight('worldDirLight', new BABYLON.Vector3(-1, -2, -1), runtime.scene);
  dir.position = new BABYLON.Vector3(6, 10, 6);
  dir.intensity = 0.7;
  return runtime;
}

export function resolveOrCreateSceneCamera(runtime: BabylonRuntimeLike, options: { preferredCameras?: BabylonCameraLike[]; fallbackPosition?: PositionLike; fallbackTarget?: PositionLike; fallbackCameraName?: string } = {}): BabylonCameraLike {
  const BABYLON = runtime.BABYLON;
  const scene = runtime.scene;
  const preferredCameras = options.preferredCameras ?? [];
  const fallbackPosition = options.fallbackPosition ?? { x: 0, y: 10, z: -12 };
  const fallbackTarget = options.fallbackTarget ?? { x: 0, y: 0, z: 0 };
  const candidateCameras = [...preferredCameras, scene.activeCamera ?? null, ...(scene.cameras ?? [])];
  let camera = candidateCameras.find((candidate) => candidate && !candidate.isDisposed?.()) ?? null;
  let source = 'imported';
  if (!camera) {
    source = 'fallback';
    camera = new BABYLON.FreeCamera(options.fallbackCameraName ?? 'sceneFallbackCamera', new BABYLON.Vector3(fallbackPosition.x, fallbackPosition.y, fallbackPosition.z), scene);
    camera.setTarget?.(new BABYLON.Vector3(fallbackTarget.x, fallbackTarget.y, fallbackTarget.z));
    camera.minZ = 0.1;
    camera.maxZ = 1000;
  }
  scene.activeCamera = camera;
  runtime.camera = camera;
  console.info('[SillyRPG] Scene camera resolved', { source, cameraName: camera.name ?? null, activeCameraName: scene.activeCamera?.name ?? null });
  return camera;
}
