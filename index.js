const SILLYRPG_DEBUG_PREFIX = '[SillyRPG]';

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

function ensureStyle() {
  if (document.getElementById('sillyrpg-style')) return;

  const link = document.createElement('link');
  link.id = 'sillyrpg-style';
  link.rel = 'stylesheet';
  link.href = new URL('style.css', EXT_BASE).toString();
  document.head.appendChild(link);
}

async function openApp() {
  try {
    const app = await import('./src/app.js');
    app.openApp();
  } catch (error) {
    console.debug(SILLYRPG_DEBUG_PREFIX, 'Failed to open app.', error);
  }
}

function ensureEntryButton() {
  const existing = document.getElementById('sillyrpg-open-btn');
  if (existing) return;

  const btn = document.createElement('button');
  btn.id = 'sillyrpg-open-btn';
  btn.type = 'button';
  btn.className = 'sillyrpg-open-btn';
  btn.textContent = 'SillyRPG';
  btn.addEventListener('click', openApp);

  const toolbarHost =
    document.querySelector('#extensions_settings') ||
    document.querySelector('.drawer-content') ||
    document.body;

  toolbarHost.appendChild(btn);
}

function bootstrap() {
  ensureStyle();
  ensureEntryButton();
  console.debug(SILLYRPG_DEBUG_PREFIX, 'bootstrapped', { EXT_BASE });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
