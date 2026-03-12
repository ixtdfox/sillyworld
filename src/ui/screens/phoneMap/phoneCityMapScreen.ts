import { resolveCatalogAssetPath } from '../../../platform/browser/assetResolver.ts';
import type { RegionId } from '../../../shared/types.ts';
import { Screen } from '../screenSystem.ts';
import { WORLD_MAP_REGIONS } from './worldMapRegions.ts';

const MAP_NATIVE_SIZE = Object.freeze({ width: 1536, height: 1024 });

export interface PhoneCityMapScreenProps {
  onRegionOpen?: (regionId: RegionId) => void;
}

function createRegionPin(region: { regionId: RegionId; label: string; x: number; y: number }, onRegionOpen: (regionId: RegionId) => void): HTMLButtonElement {
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'sillyrpg-phone-map-pin';
  pin.style.left = `${(region.x / MAP_NATIVE_SIZE.width) * 100}%`;
  pin.style.top = `${(region.y / MAP_NATIVE_SIZE.height) * 100}%`;
  pin.textContent = region.label;
  pin.addEventListener('click', () => {
    console.log(`[SillyRPG] Map region selected: ${region.regionId}`);
    onRegionOpen(region.regionId);
  });
  return pin;
}

export class MapScreen extends Screen {
  readonly #props: PhoneCityMapScreenProps;

  constructor(props: PhoneCityMapScreenProps = {}) {
    super();
    this.#props = props;
  }

  protected createRoot(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'sillyrpg-screen sillyrpg-phone-map-screen';

    const phoneFrame = document.createElement('section');
    phoneFrame.className = 'sillyrpg-phone-shell';

    const nav = document.createElement('nav');
    nav.className = 'sillyrpg-phone-nav';

    const mapButton = document.createElement('button');
    mapButton.type = 'button';
    mapButton.className = 'sillyrpg-btn';
    mapButton.textContent = 'Map';

    const inventoryButton = document.createElement('button');
    inventoryButton.type = 'button';
    inventoryButton.className = 'sillyrpg-btn';
    inventoryButton.textContent = 'Inventory';

    const display = document.createElement('div');
    display.className = 'sillyrpg-phone-display';

    const mapView = document.createElement('div');
    mapView.className = 'sillyrpg-phone-map-view';

    const mapImage = document.createElement('img');
    mapImage.className = 'sillyrpg-phone-map-image';
    mapImage.src = resolveCatalogAssetPath('textures.cityMap');
    mapImage.alt = 'World map';
    mapView.appendChild(mapImage);

    const pinLayer = document.createElement('div');
    pinLayer.className = 'sillyrpg-phone-map-pin-layer';
    mapView.appendChild(pinLayer);

    const onRegionOpen = typeof this.#props.onRegionOpen === 'function' ? this.#props.onRegionOpen : () => {};

    for (const region of WORLD_MAP_REGIONS) {
      pinLayer.appendChild(createRegionPin(region, onRegionOpen));
    }

    const inventoryView = document.createElement('div');
    inventoryView.className = 'sillyrpg-phone-inventory-view';
    inventoryView.textContent = 'Inventory screen coming online.';
    inventoryView.hidden = true;

    mapButton.addEventListener('click', () => {
      mapView.hidden = false;
      inventoryView.hidden = true;
    });

    inventoryButton.addEventListener('click', () => {
      mapView.hidden = true;
      inventoryView.hidden = false;
    });

    nav.append(mapButton, inventoryButton);
    display.append(mapView, inventoryView);
    phoneFrame.append(nav, display);
    wrap.appendChild(phoneFrame);

    return wrap;
  }
}
