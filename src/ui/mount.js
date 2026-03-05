const ROOT_ID = 'sillyrpg-root';

export function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.hidden = true;
    document.body.appendChild(root);
  }
  return root;
}

export function showRoot() {
  ensureRoot().hidden = false;
}

export function hideRoot() {
  const root = ensureRoot();
  root.hidden = true;
}

export function mountContent(node) {
  const root = ensureRoot();
  root.replaceChildren(node);
}
