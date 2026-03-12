const ROOT_ID = 'sillyrpg-root';
const APP_HOST_SELECTOR = '#app';

function getRootHost() {
  return document.querySelector(APP_HOST_SELECTOR) || document.body;
}

export function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.hidden = true;
    getRootHost().appendChild(root);
  }
  return root;
}

export function showRoot() {
  const root = ensureRoot();
  root.hidden = false;
}

export function hideRoot() {
  const root = ensureRoot();
  root.hidden = true;
}

export function mountContent(node) {
  const root = ensureRoot();
  root.replaceChildren(node);
}
