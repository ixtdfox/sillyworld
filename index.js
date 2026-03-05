const SILLYRPG_DEBUG_PREFIX = '[SillyRPG]';
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
  const button = document.createElement('button');
  button.id = TOOLBAR_BUTTON_ID;
  button.type = 'button';
  button.className = 'menu_button fa-solid';
  button.title = 'SillyRPG';
  button.setAttribute('aria-label', 'SillyRPG');
  button.textContent = '🎴';
  button.addEventListener('click', async () => {
    try {
      const app = await import('./src/app.js');
      app.openApp();
    } catch (error) {
      console.debug(SILLYRPG_DEBUG_PREFIX, 'Failed to open app.', error);
    }
  });
  return button;
}

function getToolbarHost() {
  for (const selector of TOOLBAR_CANDIDATES) {
    const host = document.querySelector(selector);
    if (host) return host;
  }
  return null;
}

function ensureToolbarButton() {
  if (document.getElementById(TOOLBAR_BUTTON_ID)) return true;
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
