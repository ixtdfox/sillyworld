export function renderTopBar({ title, breadcrumb, onBack, onExit, canGoBack }) {
  const top = document.createElement('div');
  top.className = 'sillyrpg-topbar';

  const left = document.createElement('div');
  left.className = 'sillyrpg-topbar-left';

  const backToChat = document.createElement('button');
  backToChat.type = 'button';
  backToChat.className = 'sillyrpg-btn';
  backToChat.textContent = 'Back to Chat';
  backToChat.addEventListener('click', onExit);
  left.appendChild(backToChat);

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

  top.append(left, center);
  return top;
}
