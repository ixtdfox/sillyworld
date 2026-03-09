import { mountSceneRuntime } from '../rendering/sceneRuntime.js';

export function renderSceneViewScreen() {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-scene-view-screen';

  const canvas = document.createElement('canvas');
  canvas.className = 'sillyrpg-babylon-canvas sillyrpg-scene-canvas';
  canvas.setAttribute('aria-label', '3D scene view');
  wrap.appendChild(canvas);

  let cleanup = null;

  wrap.__sillyOnMount = () => {
    mountSceneRuntime(canvas)
      .then((dispose) => {
        cleanup = dispose;
      })
      .catch((error) => {
        console.error('[SillyRPG] Failed to mount 3D scene view.', error);
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
