import { startApp } from './app.js';

function bootstrapStandalone() {
  startApp({
    title: 'SillyRPG'
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapStandalone, { once: true });
} else {
  bootstrapStandalone();
}
