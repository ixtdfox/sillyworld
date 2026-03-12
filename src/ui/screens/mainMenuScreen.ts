import { Screen } from './screenSystem.ts';
import { renderMainMenu, type MainMenuProps } from './mainMenu.ts';

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
