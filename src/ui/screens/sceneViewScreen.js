import { mountSceneRuntime } from '../rendering/sceneRuntime.js';

export function renderSceneViewScreen({ districtId, onEncounterStart } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-scene-view-screen';
  wrap.dataset.mode = 'exploration';

  const canvas = document.createElement('canvas');
  canvas.className = 'sillyrpg-babylon-canvas sillyrpg-scene-canvas';
  canvas.setAttribute('aria-label', '3D scene view');
  wrap.appendChild(canvas);

  let cleanup = null;
  let combatStarted = false;

  const startCombat = (details) => {
    if (combatStarted) {
      return;
    }

    combatStarted = true;
    wrap.dataset.mode = 'combat';
    wrap.classList.add('sillyrpg-scene-combat-mode');
    onEncounterStart?.(details);
  };

  wrap.__sillyOnMount = () => {
    mountSceneRuntime(canvas, { districtId, onEncounterStart: startCombat })
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
