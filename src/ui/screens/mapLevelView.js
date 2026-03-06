import { resolveAsset } from '../../st_bridge/asset.js';

function pickImage(node) {
  return node?.meta?.mapImage || node?.meta?.backgroundImage || node?.meta?.avatar || '';
}

export function renderMapLevelView({ config, contextNode, nodes, onNodeClick }) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = contextNode?.name || config?.displayName || 'Map';

  const image = document.createElement('img');
  image.className = 'sillyrpg-image';
  image.alt = `${title.textContent} view`;
  image.src = resolveAsset(pickImage(contextNode));

  const list = document.createElement('div');
  list.className = 'sillyrpg-card-grid';

  for (const node of nodes || []) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sillyrpg-btn sillyrpg-card';
    card.textContent = node.name;
    card.addEventListener('click', () => onNodeClick(node));
    list.appendChild(card);
  }

  wrap.append(title, image, list);
  return wrap;
}
