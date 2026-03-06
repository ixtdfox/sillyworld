const SILLYRPG_DEBUG_PREFIX = '[SillyRPG]';
const TOOLBAR_DRAWER_ID = 'sillyrpg-toolbar-drawer';
const TOOLBAR_BUTTON_ID = 'sillyrpg-toolbar-btn';
const TOOLBAR_CANDIDATES = [
  '#top-toolbar',
  '#top-bar',
  '#top-settings-holder',
  '.top-bar',
  '.toolbar',
  '.drawer-toolbar',
  '#extensionsMenu',
  'header'
];

function getExtBase() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return new URL('.', import.meta.url).toString();
    }
  } catch (error) {
    console.debug(SILLYRPG_DEBUG_PREFIX, 'import.meta.url unavailable, using fallback.', error);
  }

  const script = document.currentScript;
  if (script && script.src) {
    return new URL('.', script.src).toString();
  }

  return `${window.location.origin}/`;
}

const EXT_BASE = getExtBase();
window.__SILLYRPG__ = { EXT_BASE };

function createToolbarButton() {
  const drawer = document.createElement('div');
  drawer.id = TOOLBAR_DRAWER_ID;
  drawer.className = 'drawer';

  const drawerToggle = document.createElement('div');
  drawerToggle.className = 'drawer-toggle drawer-header';

  const button = document.createElement('div');
  button.id = TOOLBAR_BUTTON_ID;
  button.className = 'drawer-icon fa-solid interactable';
  button.title = 'SillyRPG';
  button.setAttribute('aria-label', 'SillyRPG');
  button.setAttribute('tabindex', '0');
  button.setAttribute('role', 'button');
  button.textContent = '🎴';

  const open = async () => {
    try {
      const app = await import('./src/app.js');
      app.openApp();
    } catch (error) {
      console.debug(SILLYRPG_DEBUG_PREFIX, 'Failed to open app.', error);
    }
  };

  button.addEventListener('click', open);
  button.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    }
  });

  drawerToggle.appendChild(button);
  drawer.appendChild(drawerToggle);
  return drawer;
}

function getToolbarHost() {
  for (const selector of TOOLBAR_CANDIDATES) {
    const host = document.querySelector(selector);
    if (host) return host;
  }
  return null;
}

function ensureToolbarButton() {
  if (document.getElementById(TOOLBAR_DRAWER_ID)) return true;
  const host = getToolbarHost();
  if (!host) return false;

  host.appendChild(createToolbarButton());
  return true;
}

function watchForToolbar() {
  if (ensureToolbarButton()) return;

  const observer = new MutationObserver(() => {
    if (ensureToolbarButton()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function bootstrap() {
  watchForToolbar();
  console.debug(SILLYRPG_DEBUG_PREFIX, 'bootstrapped', { EXT_BASE });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
