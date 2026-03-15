export interface MainMenuProps {
  onNewGame: () => void;
  onContinue: () => void;
  onLoadGame: () => void;
  onSettings: () => void;
  onTestCombat: () => void;
  onExit: () => void;
  hasSave: boolean;
}

interface MainMenuButtonConfig {
  label: string;
  onClick: () => void;
  hidden?: boolean;
  disabled?: boolean;
}

export function renderMainMenu({ onNewGame, onContinue, onLoadGame, onSettings, onTestCombat, onExit, hasSave }: MainMenuProps): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-menu';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = 'Main Menu';
  wrap.appendChild(title);

  const buttons: MainMenuButtonConfig[] = [
    { label: 'New Game', onClick: onNewGame },
    { label: 'Continue', onClick: onContinue, hidden: !hasSave },
    { label: hasSave ? 'Load Game' : 'Load Game (No saves yet)', onClick: onLoadGame, disabled: !hasSave },
    { label: 'Settings', onClick: onSettings },
    { label: 'Test Combat', onClick: onTestCombat },
    { label: 'Exit', onClick: onExit }
  ];

  for (const item of buttons) {
    if (item.hidden) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sillyrpg-btn sillyrpg-btn-block';
    button.textContent = item.label;
    button.disabled = Boolean(item.disabled);
    button.addEventListener('click', item.onClick);
    wrap.appendChild(button);
  }

  return wrap;
}

export interface SettingsStubProps {
  onBack: () => void;
}

export function renderSettingsStub({ onBack }: SettingsStubProps): HTMLDivElement {
  const section = document.createElement('div');
  section.className = 'sillyrpg-menu';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = 'Settings';

  const text = document.createElement('p');
  text.textContent = 'Settings coming soon.';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'sillyrpg-btn';
  back.textContent = 'Back';
  back.addEventListener('click', onBack);

  section.append(title, text, back);
  return section;
}
