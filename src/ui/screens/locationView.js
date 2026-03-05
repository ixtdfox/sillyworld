import { resolveAsset } from '../../st_bridge/asset.js';

export function renderLocationView({ location, onNpcClick }) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = location?.name || 'Location';

  const image = document.createElement('img');
  image.className = 'sillyrpg-image';
  image.alt = `${location?.name || 'Location'} background`;
  image.src = resolveAsset(location?.backgroundImage || '');

  const list = document.createElement('div');
  list.className = 'sillyrpg-npc-list';

  for (const npc of location?.npcs || []) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'sillyrpg-btn sillyrpg-npc-item';

    const avatar = document.createElement('img');
    avatar.className = 'sillyrpg-npc-avatar';
    avatar.alt = `${npc.name} avatar`;
    avatar.src = resolveAsset(npc.avatar || 'assets/npcs/npc_placeholder.svg');

    const name = document.createElement('span');
    name.textContent = npc.name;

    item.append(avatar, name);
    item.addEventListener('click', () => onNpcClick(npc));
    list.appendChild(item);
  }

  wrap.append(title, image, list);
  return wrap;
}
