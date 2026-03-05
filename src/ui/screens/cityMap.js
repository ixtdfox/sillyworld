import { resolveAsset } from '../../st_bridge/asset.js';

export function renderCityMap({ world, onOpenDistrict }) {
  const city = world?.city;
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = city?.name || 'City';

  const image = document.createElement('img');
  image.className = 'sillyrpg-image';
  image.alt = `${city?.name || 'City'} map`;
  image.src = resolveAsset(city?.mapImage || '');

  const list = document.createElement('div');
  list.className = 'sillyrpg-card-grid';
  for (const district of city?.districts || []) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sillyrpg-btn sillyrpg-card';
    card.textContent = district.name;
    card.addEventListener('click', () => onOpenDistrict(district.id));
    list.appendChild(card);
  }

  wrap.append(title, image, list);
  return wrap;
}
