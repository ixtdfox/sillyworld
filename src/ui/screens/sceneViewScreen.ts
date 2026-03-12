import { resolveAssetPath } from '../../platform/browser/assetResolver.ts';
import { mountSceneRuntime } from '../rendering/sceneRuntime.ts';
import { Screen } from './screenSystem.ts';
import type {
  EncounterStartPayload,
  NormalizationDebugInfo,
  PositionLike,
  RuntimeDebugState,
  RuntimeDispose
} from '../rendering/runtimeContracts.ts';

export interface SceneViewScreenProps {
  districtId?: string;
  onEncounterStart?: (details: EncounterStartPayload) => void;
}

function formatPosition(position: PositionLike | null | undefined): string {
  if (!position) return 'n/a';
  return `x:${position.x.toFixed(2)} y:${position.y.toFixed(2)} z:${position.z.toFixed(2)}`;
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return value.toFixed(2);
}

function formatNormalizationLine(label: string, normalization: NormalizationDebugInfo | null | undefined): string {
  if (!normalization) return `${label}: n/a`;

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

function buildDebugLines(debugState: RuntimeDebugState): string[] {
  const mode = debugState?.mode ?? 'loading';

  if (mode === 'combat') {
    const combat = debugState.combat;
    return [
      '[Debug Overlay]',
      `mode: ${mode}`,
      `round: ${combat?.round ?? 'n/a'}`,
      `active unit: ${combat?.activeUnit ?? 'n/a'}`,
      `turn owner: ${combat?.turnOwner ?? 'n/a'}`,
      `action mode: ${combat?.actionMode ?? 'n/a'}`,
      `active AP: ${combat?.activeUnitAp ?? 'n/a'}`,
      `active MP: ${combat?.activeUnitMp ?? 'n/a'}`,
      `player HP/AP/MP: ${combat?.playerHp ?? 'n/a'}/${combat?.playerAp ?? 'n/a'}/${combat?.playerMp ?? 'n/a'}`,
      `enemy HP/AP/MP: ${combat?.enemyHp ?? 'n/a'}/${combat?.enemyAp ?? 'n/a'}/${combat?.enemyMp ?? 'n/a'}`,
      `combat phase: ${combat?.phase ?? 'n/a'}`,
      `combat state: ${combat?.state ?? 'n/a'}`
    ];
  }

  if (mode === 'exploration') {
    const exploration = debugState.exploration;
    const normalization = exploration?.normalization ?? debugState.normalization ?? null;

    return [
      '[Debug Overlay]',
      `mode: ${mode}`,
      `player: ${formatPosition(exploration?.playerPosition)}`,
      `enemy: ${formatPosition(exploration?.enemyPosition)}`,
      `distance: ${formatNumber(exploration?.distanceToEnemy)}`,
      `interaction allowed: ${exploration?.enemyInteractionAllowed ? 'yes' : 'no'}`,
      formatNormalizationLine('norm player', normalization?.player),
      formatNormalizationLine('norm enemy', normalization?.enemy)
    ];
  }

  return ['[Debug Overlay]', `mode: ${mode}`];
}

function resolveSceneDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const queryFlag = params.get('debugScene');
  if (queryFlag === '1' || queryFlag === 'true') return true;
  if (queryFlag === '0' || queryFlag === 'false') return false;
  return true;
}

export class SceneViewScreen extends Screen {
  readonly #props: SceneViewScreenProps;
  readonly #debugEnabled: boolean;

  #canvas: HTMLCanvasElement | null = null;
  #debugOverlay: HTMLPreElement | null = null;
  #cleanup: RuntimeDispose | null = null;
  #combatStarted = false;

  constructor(props: SceneViewScreenProps = {}) {
    super();
    this.#props = props;
    this.#debugEnabled = resolveSceneDebugEnabled();
  }

  protected createRoot(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'sillyrpg-screen sillyrpg-scene-view-screen';
    wrap.dataset['mode'] = 'exploration';

    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'sillyrpg-babylon-canvas sillyrpg-scene-canvas';
    this.#canvas.setAttribute('aria-label', '3D scene view');

    this.#debugOverlay = document.createElement('pre');
    this.#debugOverlay.className = 'sillyrpg-scene-debug-overlay';
    this.#debugOverlay.hidden = !this.#debugEnabled;
    this.#debugOverlay.setAttribute('aria-live', 'polite');

    wrap.append(this.#canvas, this.#debugOverlay);
    this.updateDebugOverlay({ mode: 'loading' });

    return wrap;
  }

  override mount(): void {
    if (!this.#canvas) return;

    const mountOptions = {
      ...(this.#props.districtId ? { districtId: this.#props.districtId } : {}),
      debugEnabled: this.#debugEnabled,
      onEncounterStart: (details: EncounterStartPayload) => this.startCombat(details),
      onDebugStateChange: (debugState: RuntimeDebugState) => this.updateDebugOverlay(debugState),
      resolveAssetPath
    };

    mountSceneRuntime(this.#canvas, mountOptions)
      .then((dispose) => {
        this.#cleanup = dispose;
      })
      .catch((error: unknown) => {
        console.error('[SillyRPG] Failed to mount 3D scene view.', error);
      });
  }

  override update(): void {
    this.updateDebugOverlay({ mode: this.#combatStarted ? 'combat' : 'loading' });
  }

  override unmount(): void {
    if (this.#cleanup) {
      this.#cleanup();
      this.#cleanup = null;
    }
  }

  override dispose(): void {
    super.dispose();
    this.#canvas = null;
    this.#debugOverlay = null;
    this.#combatStarted = false;
  }

  private startCombat(details: EncounterStartPayload): void {
    if (this.#combatStarted) return;

    this.#combatStarted = true;
    if (this.root) {
      this.root.dataset['mode'] = 'combat';
      this.root.classList.add('sillyrpg-scene-combat-mode');
    }

    this.#props.onEncounterStart?.(details);
  }

  private updateDebugOverlay(debugState: RuntimeDebugState): void {
    if (!this.#debugEnabled || !this.#debugOverlay) return;

    if (this.root) {
      this.root.dataset['mode'] = debugState?.mode ?? 'loading';
    }

    this.#debugOverlay.textContent = buildDebugLines(debugState).join('\n');
  }
}
