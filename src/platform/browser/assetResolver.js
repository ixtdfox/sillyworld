import { getAssetPath } from '../../core/assets/assetCatalog.js';

function resolveAssetBaseUrl() {
  if (typeof document !== 'undefined' && typeof document.baseURI === 'string' && document.baseURI.length > 0) {
    return document.baseURI;
  }

  if (typeof window !== 'undefined' && window.location?.href) {
    return window.location.href;
  }

  return 'http://localhost/';
}

export function resolveAssetPath(relPath) {
  return new URL(relPath, resolveAssetBaseUrl()).toString();
}

export function resolveCatalogAssetPath(pathKey) {
  return resolveAssetPath(getAssetPath(pathKey));
}
