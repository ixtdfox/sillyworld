export function renderTopBar({ title, breadcrumb, onBack, onExit, canGoBack }) {
  const top = document.createElement('div');
  top.className = 'sillyrpg-topbar';

  const left = document.createElement('div');
  left.className = 'sillyrpg-topbar-left';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'sillyrpg-btn';
  back.textContent = 'Back';
  back.disabled = !canGoBack;
  back.addEventListener('click', onBack);

  left.appendChild(back);

  const center = document.createElement('div');
  center.className = 'sillyrpg-topbar-center';
  center.innerHTML = `<div class="sillyrpg-title">${title}</div><div class="sillyrpg-breadcrumb">${breadcrumb || ''}</div>`;

  const right = document.createElement('div');
  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'sillyrpg-btn sillyrpg-btn-danger';
  exit.textContent = 'Exit';
  exit.addEventListener('click', onExit);
  right.appendChild(exit);

  top.append(left, center, right);
  return top;
}
