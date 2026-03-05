const ROOT_ID = 'sillyrpg-root';
const CHAT_UI_SELECTORS = [
  '#chat',
  '#chat_parent',
  '#chat_display',
  '#send_form',
  '#rightSendForm',
  '#sheld',
  '#WorldInfo',
  '#extensions_settings',
  '#left-nav-panel',
  '#right-nav-panel',
  '.chat',
  '.chat_main',
  '.chat-display',
  '.chat_input',
  '.drawer-content'
];

const hiddenElements = new Map();

function setChatVisibility(hidden) {
  const unique = new Set();
  for (const selector of CHAT_UI_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      if (element.id === ROOT_ID || element.closest(`#${ROOT_ID}`)) continue;
      unique.add(element);
    }
  }

  unique.forEach((element) => {
    if (hidden) {
      if (!hiddenElements.has(element)) {
        hiddenElements.set(element, element.style.display);
      }
      element.style.display = 'none';
    } else if (hiddenElements.has(element)) {
      element.style.display = hiddenElements.get(element) || '';
      hiddenElements.delete(element);
    }
  });
}

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
  const root = ensureRoot();
  root.hidden = false;
  setChatVisibility(true);
}

export function hideRoot() {
  const root = ensureRoot();
  root.hidden = true;
  setChatVisibility(false);
}

export function mountContent(node) {
  const root = ensureRoot();
  root.replaceChildren(node);
}
