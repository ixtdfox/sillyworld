/**
 * Платформенный адаптер браузера: изолирует работу с окружением (URL, storage, загрузка seed/asset path).
 */
import { getAssetPath } from '../../core/assets/assetCatalog.ts';

/** Определяет контракт `AssetPathResolver` для согласованного взаимодействия модулей в контексте `platform/browser/assetResolver`. */
export interface AssetPathResolver {
  resolveAssetPath(relPath: string): string;
  resolveCatalogAssetPath(pathKey: string): string;
}

/** Определяет контракт `BrowserUrlProvider` для согласованного взаимодействия модулей в контексте `platform/browser/assetResolver`. */
export interface BrowserUrlProvider {
  getDocumentBaseUri(): string | null;
  getWindowLocationHref(): string | null;
}

const globalBrowserUrlProvider: BrowserUrlProvider = {
  /** Возвращает `getDocumentBaseUri` внутри жизненного цикла класса. */
  getDocumentBaseUri(): string | null {
    if (typeof document === 'undefined' || typeof document.baseURI !== 'string') return null;
    return document.baseURI.length > 0 ? document.baseURI : null;
  },

  /** Возвращает `getWindowLocationHref` внутри жизненного цикла класса. */
  getWindowLocationHref(): string | null {
    if (typeof window === 'undefined' || typeof window.location?.href !== 'string') return null;
    return window.location.href.length > 0 ? window.location.href : null;
  }
};

/** Определяет контракт `AssetResolverConfig` для согласованного взаимодействия модулей в контексте `platform/browser/assetResolver`. */
export interface AssetResolverConfig {
  defaultAssetBaseUrl?: string;
  urlProvider?: BrowserUrlProvider;
}

/** Класс `AssetResolver` координирует соответствующий сценарий модуля `platform/browser/assetResolver` и инкапсулирует связанную логику. */
export class AssetResolver implements AssetPathResolver {
  private readonly defaultAssetBaseUrl: string;
  private readonly urlProvider: BrowserUrlProvider;

  constructor(config: AssetResolverConfig = {}) {
    this.defaultAssetBaseUrl = this.resolveDefaultAssetBaseUrl(config.defaultAssetBaseUrl);
    this.urlProvider = config.urlProvider ?? globalBrowserUrlProvider;
  }

  /** Определяет `resolveAssetPath` внутри жизненного цикла класса. */
  resolveAssetPath(relPath: string): string {
    return new URL(relPath, this.resolveAssetBaseUrl()).toString();
  }

  /** Определяет `resolveCatalogAssetPath` внутри жизненного цикла класса. */
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

  private resolveDefaultAssetBaseUrl(defaultAssetBaseUrl?: string): string {
    const resolvedBaseUrl = defaultAssetBaseUrl ?? 'http://localhost/';
    if (resolvedBaseUrl.trim().length === 0) {
      throw new Error('Asset resolver defaultAssetBaseUrl must be a non-empty string.');
    }
    return resolvedBaseUrl;
  }
}

const defaultAssetResolver = new AssetResolver();

/** Константа `resolveAssetPath` хранит общие настройки/данные, которые переиспользуются в модуле `platform/browser/assetResolver`. */
export const resolveAssetPath: AssetPathResolver['resolveAssetPath'] = (relPath) => {
  return defaultAssetResolver.resolveAssetPath(relPath);
};

/** Константа `resolveCatalogAssetPath` хранит общие настройки/данные, которые переиспользуются в модуле `platform/browser/assetResolver`. */
export const resolveCatalogAssetPath: AssetPathResolver['resolveCatalogAssetPath'] = (pathKey) => {
  return defaultAssetResolver.resolveCatalogAssetPath(pathKey);
};
