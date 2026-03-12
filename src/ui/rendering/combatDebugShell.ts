const SHELL_RUNTIME_KEY = '__combatDebugShellController';

function createPrimitiveButton(runtime, label, onClick) {
  const button = new runtime.BABYLON.GUI.Rectangle();
  button.width = '118px';
  button.height = '30px';
  button.thickness = 1;
  button.cornerRadius = 4;
  button.color = '#d8ecff';
  button.background = '#1f3347cc';
  button.paddingRight = '6px';

  const text = new runtime.BABYLON.GUI.TextBlock();
  text.text = label;
  text.color = '#ffffff';
  text.fontSize = 12;
  button.addControl(text);

  button.onPointerDownObservable.add(() => {
    if (!button.isEnabled) {
      return;
    }

    onClick?.();
  });

  return { button, text };
}

function normalizePanelController(created) {
  if (!created) {
    return {
      setVisible: () => {},
      dispose: () => {}
    };
  }

  if (typeof created === 'function') {
    return {
      setVisible: () => {},
      dispose: created
    };
  }

  return {
    setVisible: typeof created.setVisible === 'function' ? created.setVisible : () => {},
    dispose: typeof created.dispose === 'function' ? created.dispose : () => {}
  };
}

export function createCombatDebugShell(runtime) {
  if (runtime[SHELL_RUNTIME_KEY]) {
    runtime[SHELL_RUNTIME_KEY].dispose();
  }

  const texture = runtime.BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('combatDebugShell', true, runtime.scene);

  const shellContainer = new runtime.BABYLON.GUI.Rectangle();
  shellContainer.width = '512px';
  shellContainer.height = '64px';
  shellContainer.thickness = 1;
  shellContainer.cornerRadius = 6;
  shellContainer.color = '#9dc7f5';
  shellContainer.background = '#0b1724cc';
  shellContainer.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  shellContainer.verticalAlignment = runtime.BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  shellContainer.top = '12px';
  shellContainer.left = '-12px';
  texture.addControl(shellContainer);

  const rootRow = new runtime.BABYLON.GUI.StackPanel();
  rootRow.isVertical = false;
  rootRow.height = '56px';
  rootRow.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  shellContainer.addControl(rootRow);

  const title = new runtime.BABYLON.GUI.TextBlock();
  title.text = 'Debug';
  title.width = '64px';
  title.color = '#ffffff';
  title.fontSize = 14;
  title.fontWeight = 'bold';
  rootRow.addControl(title);

  const panels = new Map();

  const registerPanel = ({ id, label, createPanel, initialVisible = false, enabled = true }) => {
    if (!id || typeof createPanel !== 'function') {
      return;
    }

    if (panels.has(id)) {
      return;
    }

    const panelState = {
      id,
      label,
      createPanel,
      visible: false,
      controller: null,
      button: null,
      text: null,
      enabled
    };

    const setButtonState = () => {
      if (!panelState.button) {
        return;
      }

      panelState.button.isEnabled = panelState.enabled;
      panelState.button.background = panelState.visible ? '#2f7d42dd' : '#1f3347cc';
      panelState.button.color = panelState.enabled ? '#d8ecff' : '#5d6c7a';
      panelState.text.color = panelState.enabled ? '#ffffff' : '#9aa5b1';
      panelState.text.text = panelState.enabled ? `${label}${panelState.visible ? ' ✓' : ''}` : `${label} (TBD)`;
    };

    const hidePanel = () => {
      if (!panelState.visible) {
        return;
      }

      panelState.visible = false;
      panelState.controller?.setVisible?.(false);
      setButtonState();
    };

    const showPanel = () => {
      if (panelState.visible) {
        return;
      }

      if (!panelState.controller) {
        panelState.controller = normalizePanelController(panelState.createPanel());
      }

      panelState.visible = true;
      panelState.controller.setVisible?.(true);
      setButtonState();
    };

    const togglePanel = () => {
      if (!panelState.enabled) {
        return;
      }

      if (panelState.visible) {
        hidePanel();
        return;
      }

      showPanel();
    };

    const buttonParts = createPrimitiveButton(runtime, label, togglePanel);
    panelState.button = buttonParts.button;
    panelState.text = buttonParts.text;
    rootRow.addControl(buttonParts.button);

    panelState.setVisible = (visible) => {
      if (visible) {
        showPanel();
      } else {
        hidePanel();
      }
    };
    panelState.dispose = () => {
      panelState.visible = false;
      panelState.controller?.dispose?.();
      panelState.controller = null;
    };

    panels.set(id, panelState);
    setButtonState();

    if (initialVisible) {
      showPanel();
    }
  };

  const dispose = () => {
    for (const panel of panels.values()) {
      panel.dispose();
    }
    panels.clear();
    texture.dispose();

    if (runtime[SHELL_RUNTIME_KEY] === shell) {
      delete runtime[SHELL_RUNTIME_KEY];
    }
  };

  const shell = {
    registerPanel,
    dispose
  };

  runtime[SHELL_RUNTIME_KEY] = shell;
  return shell;
}
