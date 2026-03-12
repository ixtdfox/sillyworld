export interface ScreenLifecycle {
  create(): HTMLElement;
  mount(): void;
  update(): void;
  unmount(): void;
  dispose(): void;
}

export abstract class Screen implements ScreenLifecycle {
  protected root: HTMLElement | null = null;

  create(): HTMLElement {
    if (!this.root) {
      this.root = this.createRoot();
    }

    return this.root;
  }

  mount(): void {}

  update(): void {}

  unmount(): void {}

  dispose(): void {
    this.unmount();
    this.root = null;
  }

  protected abstract createRoot(): HTMLElement;
}

export class ScreenManager {
  #activeScreen: Screen | null = null;

  mount(host: HTMLElement, screen: Screen): void {
    const screenNode = screen.create();

    if (this.#activeScreen) {
      this.#activeScreen.unmount();
    }

    host.replaceChildren(screenNode);
    this.#activeScreen = screen;
    screen.mount();
  }

  updateActive(): void {
    this.#activeScreen?.update();
  }

  clear(host?: HTMLElement): void {
    if (this.#activeScreen) {
      this.#activeScreen.unmount();
      this.#activeScreen.dispose();
      this.#activeScreen = null;
    }

    host?.replaceChildren();
  }
}
