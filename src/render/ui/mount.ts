/**
 * Модуль слоя render: отвечает за визуальное представление состояния мира, UI и отладочные оверлеи.
 */
const ROOT_ID = 'sillyrpg-root';
const APP_HOST_SELECTOR = '#app';

/** Определяет контракт `RootHostLookupOptions` для согласованного взаимодействия модулей в контексте `render/ui/mount`. */
export interface RootHostLookupOptions {
  hostSelector?: string;
  fallbackHost?: HTMLElement;
}

/** Описывает тип `RootHostLookup`, который формализует структуру данных в модуле `render/ui/mount`. */
export type RootHostLookup = (options?: RootHostLookupOptions) => HTMLElement;

/** Возвращает `getRootHostLookup` в ходе выполнения связанного игрового сценария. */
function getRootHostLookup(options: RootHostLookupOptions = {}): HTMLElement {
  const { hostSelector = APP_HOST_SELECTOR, fallbackHost = document.body } = options;
  const host = document.querySelector<HTMLElement>(hostSelector);
  return host ?? fallbackHost;
}

/** Константа `getRootHost` хранит общие настройки/данные, которые переиспользуются в модуле `render/ui/mount`. */
export const getRootHost: RootHostLookup = (options) => getRootHostLookup(options);

/** Описывает тип `MountContent`, который формализует структуру данных в модуле `render/ui/mount`. */
export type MountContent = (node: Node) => void;

/** Выполняет `ensureRoot` в ходе выполнения связанного игрового сценария. */
export function ensureRoot(): HTMLDivElement {
  const existingRoot = document.getElementById(ROOT_ID);
  if (existingRoot instanceof HTMLDivElement) {
    return existingRoot;
  }

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.hidden = true;
  getRootHost().appendChild(root);
  return root;
}

/** Создаёт и настраивает `createRoot` в ходе выполнения связанного игрового сценария. */
export function createRoot(): void {
  const root = ensureRoot();
  root.hidden = false;
}

/** Выполняет `hideRoot` в ходе выполнения связанного игрового сценария. */
export function hideRoot(): void {
  const root = ensureRoot();
  root.hidden = true;
}

/** Константа `mountContent` хранит общие настройки/данные, которые переиспользуются в модуле `render/ui/mount`. */
export const mountContent: MountContent = (node) => {
  const root = ensureRoot();
  root.replaceChildren(node);
};
