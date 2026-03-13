const ROOT_ID = 'sillyrpg-root';
const APP_HOST_SELECTOR = '#app';

export interface RootHostLookupOptions {
  hostSelector?: string;
  fallbackHost?: HTMLElement;
}

export type RootHostLookup = (options?: RootHostLookupOptions) => HTMLElement;

function getRootHostLookup(options: RootHostLookupOptions = {}): HTMLElement {
  const { hostSelector = APP_HOST_SELECTOR, fallbackHost = document.body } = options;
  const host = document.querySelector<HTMLElement>(hostSelector);
  return host ?? fallbackHost;
}

export const getRootHost: RootHostLookup = (options) => getRootHostLookup(options);

export type MountContent = (node: Node) => void;

export function ensureRoot(): HTMLDivElement {
  const existingRoot = document.getElementById(ROOT_ID);
  if (existingRoot instanceof HTMLDivElement) {
    return existingRoot;
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.hidden = true;
  getRootHost().appendChild(root);
  return root;
}

export function createRoot(): void {
  const root = ensureRoot();
  root.hidden = false;
}

export function hideRoot(): void {
  const root = ensureRoot();
  root.hidden = true;
}

export const mountContent: MountContent = (node) => {
  const root = ensureRoot();
  root.replaceChildren(node);
};
