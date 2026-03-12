import { Screen } from './screenSystem.js';
import { renderMainMenu, type MainMenuProps } from './mainMenu.js';

export class MainMenuScreen extends Screen {
  readonly #props: MainMenuProps;

  constructor(props: MainMenuProps) {
    super();
    this.#props = props;
  }

  protected createRoot(): HTMLElement {
    return renderMainMenu(this.#props);
  }
}
