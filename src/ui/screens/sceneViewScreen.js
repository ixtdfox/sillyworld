import { mountSceneRuntime } from '../rendering/sceneRuntime.js';

function formatPosition(position) {
  if (!position) {
    return 'n/a';
  }

  return `x:${position.x.toFixed(2)} y:${position.y.toFixed(2)} z:${position.z.toFixed(2)}`;
}

function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }

  return value.toFixed(2);
}

function buildDebugLines(debugState) {
  const mode = debugState?.mode ?? 'loading';

  if (mode === 'combat') {
    const combat = debugState.combat ?? {};
    return [
      '[Debug Overlay]',
      `mode: ${mode}`,
      `round: ${combat.round ?? 'n/a'}`,
      `active unit: ${combat.activeUnit ?? 'n/a'}`,
      `active AP: ${combat.activeUnitAp ?? 'n/a'}`,
      `active MP: ${combat.activeUnitMp ?? 'n/a'}`,
      `player HP: ${combat.playerHp ?? 'n/a'}`,
      `enemy HP: ${combat.enemyHp ?? 'n/a'}`,
      `combat phase: ${combat.phase ?? 'n/a'}`,
      `combat state: ${combat.state ?? 'n/a'}`
    ];
  }

  if (mode === 'exploration') {
    const exploration = debugState.exploration ?? {};
    return [
      '[Debug Overlay]',
      `mode: ${mode}`,
      `player: ${formatPosition(exploration.playerPosition)}`,
      `enemy: ${formatPosition(exploration.enemyPosition)}`,
      `distance: ${formatNumber(exploration.distanceToEnemy)}`,
      `interaction allowed: ${exploration.enemyInteractionAllowed ? 'yes' : 'no'}`
    ];
  }

  return [
    '[Debug Overlay]',
    `mode: ${mode}`
  ];
}

export function renderSceneViewScreen({ districtId, onEncounterStart } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-scene-view-screen';
  wrap.dataset.mode = 'exploration';

  const canvas = document.createElement('canvas');
  canvas.className = 'sillyrpg-babylon-canvas sillyrpg-scene-canvas';
  canvas.setAttribute('aria-label', '3D scene view');
  wrap.appendChild(canvas);

  const debugOverlay = document.createElement('pre');
  debugOverlay.className = 'sillyrpg-scene-debug-overlay';
  debugOverlay.setAttribute('aria-live', 'polite');
  wrap.appendChild(debugOverlay);

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

  const updateDebugOverlay = (debugState) => {
    const mode = debugState?.mode ?? 'loading';
    wrap.dataset.mode = mode;
    debugOverlay.textContent = buildDebugLines(debugState).join('\n');
  };

  updateDebugOverlay({ mode: 'loading' });

  wrap.__sillyOnMount = () => {
    mountSceneRuntime(canvas, {
      districtId,
      onEncounterStart: startCombat,
      onDebugStateChange: updateDebugOverlay
    })
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
