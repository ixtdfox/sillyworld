/** Определяет контракт `ScreenLifecycle` для согласованного взаимодействия модулей в контексте `render/ui/screens/screenSystem`. */
export interface ScreenLifecycle {
  create(): HTMLElement;
  mount(): void;
  update(): void;
  unmount(): void;
  dispose(): void;
}

export abstract class Screen implements ScreenLifecycle {
  protected root: HTMLElement | null = null;

  /** Создаёт и настраивает `create` внутри жизненного цикла класса. */
  create(): HTMLElement {
    if (!this.root) {
      this.root = this.createRoot();
    }

    return this.root;
  }

  mount(): void {}

  update(): void {}

  unmount(): void {}

  /** Выполняет `dispose` внутри жизненного цикла класса. */
  dispose(): void {
    this.unmount();
    this.root = null;
  }

  protected abstract createRoot(): HTMLElement;
}

/** Класс `ScreenManager` координирует соответствующий сценарий модуля `render/ui/screens/screenSystem` и инкапсулирует связанную логику. */
export class ScreenManager {
  #activeScreen: Screen | null = null;

  /** Выполняет `mount` внутри жизненного цикла класса. */
  mount(host: HTMLElement, screen: Screen): void {
    const screenNode = screen.create();

    if (this.#activeScreen) {
      this.#activeScreen.unmount();
    }

    host.replaceChildren(screenNode);
    this.#activeScreen = screen;
    screen.mount();
  }

  /** Выполняет `updateActive` внутри жизненного цикла класса. */
  updateActive(): void {
    this.#activeScreen?.update();
  }

  /** Выполняет `clear` внутри жизненного цикла класса. */
  clear(host?: HTMLElement): void {
    if (this.#activeScreen) {
      this.#activeScreen.unmount();
      this.#activeScreen.dispose();
      this.#activeScreen = null;
    }

    host?.replaceChildren();
  }
}
