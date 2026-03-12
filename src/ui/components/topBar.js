export function renderTopBar({ title, breadcrumb, phaseInfo, onBack, onExit, canGoBack, hideExit = false }) {
  const top = document.createElement('div');
  top.className = 'sillyrpg-topbar';

  const left = document.createElement('div');
  left.className = 'sillyrpg-topbar-left';

  if (!hideExit) {
    const backToChat = document.createElement('button');
    backToChat.type = 'button';
    backToChat.className = 'sillyrpg-btn';
    backToChat.textContent = 'Back to Chat';
    backToChat.addEventListener('click', onExit);
    left.appendChild(backToChat);
  }

  if (canGoBack) {
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'sillyrpg-btn';
    back.textContent = '←';
    back.title = 'Back';
    back.addEventListener('click', onBack);
    left.appendChild(back);
  }

  const center = document.createElement('div');
  center.className = 'sillyrpg-topbar-center';
  center.innerHTML = `<div class="sillyrpg-title">${title}</div><div class="sillyrpg-breadcrumb">${breadcrumb || ''}</div>`;

  if (phaseInfo?.label) {
    const phase = document.createElement('div');
    phase.className = 'sillyrpg-phase-indicator';

    const phaseTitle = document.createElement('span');
    phaseTitle.className = 'sillyrpg-phase-indicator-title';
    phaseTitle.textContent = `Day ${phaseInfo.dayNumber} · ${phaseInfo.label}`;

    const phaseHint = document.createElement('span');
    phaseHint.className = 'sillyrpg-phase-indicator-copy';
    phaseHint.textContent = phaseInfo.hint || '';

    phase.append(phaseTitle, phaseHint);
    center.appendChild(phase);
  }

  top.append(left, center);
  return top;
}
