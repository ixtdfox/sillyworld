import { getAssetPath } from '../../core/assets/assetCatalog.js';

export interface AssetPathResolver {
  resolveAssetPath(relPath: string): string;
  resolveCatalogAssetPath(pathKey: string): string;
}

export interface BrowserUrlProvider {
  getDocumentBaseUri(): string | null;
  getWindowLocationHref(): string | null;
}

class GlobalBrowserUrlProvider implements BrowserUrlProvider {
  getDocumentBaseUri(): string | null {
    if (typeof document === 'undefined' || typeof document.baseURI !== 'string') return null;
    return document.baseURI.length > 0 ? document.baseURI : null;
  }

  getWindowLocationHref(): string | null {
    if (typeof window === 'undefined' || typeof window.location?.href !== 'string') return null;
    return window.location.href.length > 0 ? window.location.href : null;
  }
}

export interface AssetResolverConfig {
  defaultAssetBaseUrl?: string;
  urlProvider?: BrowserUrlProvider;
}

export class AssetResolver implements AssetPathResolver {
  private readonly defaultAssetBaseUrl: string;
  private readonly urlProvider: BrowserUrlProvider;

  constructor(config: AssetResolverConfig = {}) {
    this.defaultAssetBaseUrl = config.defaultAssetBaseUrl ?? 'http://localhost/';
    this.urlProvider = config.urlProvider ?? new GlobalBrowserUrlProvider();
  }

  resolveAssetPath(relPath: string): string {
    return new URL(relPath, this.resolveAssetBaseUrl()).toString();
  }

  resolveCatalogAssetPath(pathKey: string): string {
    return this.resolveAssetPath(getAssetPath(pathKey));
  }

  private resolveAssetBaseUrl(): string {
    const baseUri = this.urlProvider.getDocumentBaseUri();
    if (baseUri) return baseUri;

    const locationHref = this.urlProvider.getWindowLocationHref();
    if (locationHref) return locationHref;

    // Explicit fallback keeps URL resolution deterministic in non-DOM environments.
    return this.defaultAssetBaseUrl;
  }
}

const defaultAssetResolver = new AssetResolver();

export const resolveAssetPath: AssetPathResolver['resolveAssetPath'] = (relPath) => {
  return defaultAssetResolver.resolveAssetPath(relPath);
};

export const resolveCatalogAssetPath: AssetPathResolver['resolveCatalogAssetPath'] = (pathKey) => {
  return defaultAssetResolver.resolveCatalogAssetPath(pathKey);
};
