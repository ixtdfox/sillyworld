import { startApp } from './app.js';

window.__SILLYRPG__ = {
  ...(window.__SILLYRPG__ || {}),
  EXT_BASE: new URL('../', import.meta.url).toString()
};

function bootstrapStandalone() {
  startApp({
    title: 'SillyRPG',
    rootId: 'sillyrpg-standalone-root',
    rootHostSelectors: ['#app'],
    manageExternalUi: false,
    isStandalone: true
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapStandalone, { once: true });
} else {
  bootstrapStandalone();
}
