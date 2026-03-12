import { resolveAssetPath } from '../../platform/browser/assetResolver.js';
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

function formatNormalizationLine(label, normalization) {
  if (!normalization) {
    return `${label}: n/a`;
  }

  return [
    `${label}: ${normalization.entityId ?? 'n/a'}`,
    `targetH:${formatNumber(normalization.targetHeight)}`,
    `currentH:${formatNumber(normalization.currentHeight)}`,
    `scale:${formatNumber(normalization.scaleFactor)}`,
    `colR:${formatNumber(normalization.collisionRadius)}`,
    `colH:${formatNumber(normalization.collisionHeight)}`,
    `range:${formatNumber(normalization.attackRange)}`
  ].join(' | ');
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
      `turn owner: ${combat.turnOwner ?? 'n/a'}`,
      `action mode: ${combat.actionMode ?? 'n/a'}`,
      `active AP: ${combat.activeUnitAp ?? 'n/a'}`,
      `active MP: ${combat.activeUnitMp ?? 'n/a'}`,
      `player HP/AP/MP: ${combat.playerHp ?? 'n/a'}/${combat.playerAp ?? 'n/a'}/${combat.playerMp ?? 'n/a'}`,
      `enemy HP/AP/MP: ${combat.enemyHp ?? 'n/a'}/${combat.enemyAp ?? 'n/a'}/${combat.enemyMp ?? 'n/a'}`,
      `combat phase: ${combat.phase ?? 'n/a'}`,
      `combat state: ${combat.state ?? 'n/a'}`
    ];
  }

  if (mode === 'exploration') {
    const exploration = debugState.exploration ?? {};
    const normalization = exploration.normalization ?? debugState.normalization ?? {};

    return [
      '[Debug Overlay]',
      `mode: ${mode}`,
      `player: ${formatPosition(exploration.playerPosition)}`,
      `enemy: ${formatPosition(exploration.enemyPosition)}`,
      `distance: ${formatNumber(exploration.distanceToEnemy)}`,
      `interaction allowed: ${exploration.enemyInteractionAllowed ? 'yes' : 'no'}`,
      formatNormalizationLine('norm player', normalization.player),
      formatNormalizationLine('norm enemy', normalization.enemy)
    ];
  }

  return [
    '[Debug Overlay]',
    `mode: ${mode}`
  ];
}

function resolveSceneDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const queryFlag = params.get('debugScene');
  if (queryFlag === '1' || queryFlag === 'true') {
    return true;
  }

  if (queryFlag === '0' || queryFlag === 'false') {
    return false;
  }

  return true;
}

export function renderSceneViewScreen({ districtId, onEncounterStart } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-scene-view-screen';
  wrap.dataset.mode = 'exploration';

  const canvas = document.createElement('canvas');
  canvas.className = 'sillyrpg-babylon-canvas sillyrpg-scene-canvas';
  canvas.setAttribute('aria-label', '3D scene view');
  wrap.appendChild(canvas);

  const debugEnabled = resolveSceneDebugEnabled();

  const debugOverlay = document.createElement('pre');
  debugOverlay.className = 'sillyrpg-scene-debug-overlay';
  debugOverlay.hidden = !debugEnabled;
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
    if (!debugEnabled) {
      return;
    }

    const mode = debugState?.mode ?? 'loading';
    wrap.dataset.mode = mode;
    debugOverlay.textContent = buildDebugLines(debugState).join('\n');
  };

  updateDebugOverlay({ mode: 'loading' });

  wrap.__sillyOnMount = () => {
    mountSceneRuntime(canvas, {
      districtId,
      debugEnabled,
      onEncounterStart: startCombat,
      onDebugStateChange: updateDebugOverlay,
      resolveAssetPath
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
