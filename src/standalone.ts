/**
 * Модуль проекта с прикладной логикой; используется как часть общего игрового runtime.
 */
import { startApp } from './app.ts';

/** Выполняет `bootstrapStandalone` в ходе выполнения связанного игрового сценария. */
function bootstrapStandalone(): void {
  console.info('[SillyRPG] Standalone bootstrap starting.');
  void startApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapStandalone, { once: true });
} else {
  bootstrapStandalone();
}
