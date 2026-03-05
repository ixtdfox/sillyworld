import { resolveAsset } from '../../st_bridge/asset.js';

export function renderDistrictMap({ district, onOpenLocation }) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = district?.name || 'District';

  const image = document.createElement('img');
  image.className = 'sillyrpg-image';
  image.alt = `${district?.name || 'District'} map`;
  image.src = resolveAsset(district?.mapImage || '');

  const list = document.createElement('div');
  list.className = 'sillyrpg-card-grid';

  for (const poi of district?.pois || []) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sillyrpg-btn sillyrpg-card';
    card.textContent = poi.name;
    card.addEventListener('click', () => onOpenLocation(poi.locationId));
    list.appendChild(card);
  }

  wrap.append(title, image, list);
  return wrap;
}
