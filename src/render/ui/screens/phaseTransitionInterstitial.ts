import type { PhaseTransitionRecord } from '../../../world/contracts.ts';

/** Определяет контракт `PhaseTransitionInterstitialProps` для согласованного взаимодействия модулей в контексте `render/ui/screens/phaseTransitionInterstitial`. */
export interface PhaseTransitionInterstitialProps {
  transition: PhaseTransitionRecord;
  onContinue: () => void;
}

/** Выполняет `prettifyPhase` в ходе выполнения связанного игрового сценария. */
function prettifyPhase(phase = ''): string {
  if (!phase) return '';
  return phase[0].toUpperCase() + phase.slice(1);
}

/** Выполняет `renderPhaseTransitionInterstitial` в ходе выполнения связанного игрового сценария. */
export function renderPhaseTransitionInterstitial({ transition, onContinue }: PhaseTransitionInterstitialProps): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen sillyrpg-phase-interstitial';

  const banner = document.createElement('p');
  banner.className = 'sillyrpg-phase-banner';
  banner.textContent = `Phase Shift · Day ${transition.dayNumber}`;

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = `${prettifyPhase(transition.fromPhase)} → ${prettifyPhase(transition.toPhase)}`;

  const copy = document.createElement('p');
  copy.className = 'sillyrpg-location-copy';
  copy.textContent = `Larkspur moves into ${prettifyPhase(transition.toPhase)}. Schedules, patrol routes, and opportunities can now change.`;

  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'sillyrpg-btn sillyrpg-btn-block';
  continueButton.textContent = 'Continue';
  continueButton.addEventListener('click', onContinue);

  wrap.append(banner, title, copy, continueButton);
  return wrap;
}
