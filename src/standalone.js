import { startApp } from './app.js';

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
