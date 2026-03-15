import { Screen } from './screenSystem.ts';
import { renderMainMenu, type MainMenuProps } from './mainMenu.ts';

/** Класс `MainMenuScreen` координирует соответствующий сценарий модуля `render/ui/screens/mainMenuScreen` и инкапсулирует связанную логику. */
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
