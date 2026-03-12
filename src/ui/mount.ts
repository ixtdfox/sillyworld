const ROOT_ID = 'sillyrpg-root';
const APP_HOST_SELECTOR = '#app';

function getRootHost(): HTMLElement {
  const host = document.querySelector<HTMLElement>(APP_HOST_SELECTOR);
  return host ?? document.body;
}

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

export function showRoot(): void {
  const root = ensureRoot();
  root.hidden = false;
}

export function hideRoot(): void {
  const root = ensureRoot();
  root.hidden = true;
}

export function mountContent(node: Node): void {
  const root = ensureRoot();
  root.replaceChildren(node);
}
