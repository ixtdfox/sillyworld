const ROOT_ID = 'sillyrpg-root';
const ROOT_HOST_SELECTORS = ['#movingDivs', '#movingUIWrapper', '#bg_load'];
let currentRootId = ROOT_ID;
let currentRootHostSelectors = [...ROOT_HOST_SELECTORS];
let shouldManageExternalUi = true;

function getRootHost() {
  for (const selector of currentRootHostSelectors) {
    const host = document.querySelector(selector);
    if (host) return host;
  }

  return document.body;
}
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
  let root = document.getElementById(currentRootId);
  if (!root) {
    root = document.createElement('div');
    root.id = currentRootId;
    root.hidden = true;
    getRootHost().appendChild(root);
  }
  return root;
}

export function configureMount({ rootId, rootHostSelectors, manageExternalUi } = {}) {
  if (typeof rootId === 'string' && rootId.trim()) {
    currentRootId = rootId;
  }

  if (Array.isArray(rootHostSelectors) && rootHostSelectors.length > 0) {
    currentRootHostSelectors = [...rootHostSelectors];
  }

  if (typeof manageExternalUi === 'boolean') {
    shouldManageExternalUi = manageExternalUi;
  }
}

export function showRoot() {
  const root = ensureRoot();
  root.hidden = false;
  if (shouldManageExternalUi) {
    setChatVisibility(true);
  }
}

export function hideRoot() {
  const root = ensureRoot();
  root.hidden = true;
  if (shouldManageExternalUi) {
    setChatVisibility(false);
  }
}

export function mountContent(node) {
  const root = ensureRoot();
  root.replaceChildren(node);
}
