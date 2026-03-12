import { getAssetPath } from '../../core/assets/assetCatalog.js';

export interface AssetPathResolver {
  resolveAssetPath(relPath: string): string;
  resolveCatalogAssetPath(pathKey: string): string;
}

interface BrowserUrlEnvironment {
  hasDocumentBaseUri: boolean;
  hasWindowLocationHref: boolean;
}

const DEFAULT_ASSET_BASE_URL = 'http://localhost/';

function resolveBrowserUrlEnvironment(): BrowserUrlEnvironment {
  const hasDocumentBaseUri =
    typeof document !== 'undefined' &&
    typeof document.baseURI === 'string' &&
    document.baseURI.length > 0;

  const hasWindowLocationHref =
    typeof window !== 'undefined' &&
    typeof window.location?.href === 'string' &&
    window.location.href.length > 0;

  return {
    hasDocumentBaseUri,
    hasWindowLocationHref
  };
}

function resolveAssetBaseUrl(): string {
  const env = resolveBrowserUrlEnvironment();
  if (env.hasDocumentBaseUri) return document.baseURI;
  if (env.hasWindowLocationHref) return window.location.href;

  // Explicit fallback keeps URL resolution deterministic in non-DOM environments.
  return DEFAULT_ASSET_BASE_URL;
}

export const resolveAssetPath: AssetPathResolver['resolveAssetPath'] = (relPath) => {
  return new URL(relPath, resolveAssetBaseUrl()).toString();
};

export const resolveCatalogAssetPath: AssetPathResolver['resolveCatalogAssetPath'] = (pathKey) => {
  return resolveAssetPath(getAssetPath(pathKey));
};
