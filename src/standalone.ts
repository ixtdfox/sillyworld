import { startApp } from './app.js';

function bootstrapStandalone(): void {
  console.info('[SillyRPG] Standalone bootstrap starting.');
  void startApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapStandalone, { once: true });
} else {
  bootstrapStandalone();
}
