// @ts-nocheck
const HUD_RUNTIME_KEY = '__combatDebugHudController';

/** Создаёт и настраивает `createValueRow` в ходе выполнения связанного игрового сценария. */
function createValueRow(runtime, parent, label, options = {}) {
  const { labelWidth = '140px' } = options;

  const row = new runtime.BABYLON.GUI.StackPanel();
  row.isVertical = false;
  row.height = '24px';
  row.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

  const labelText = new runtime.BABYLON.GUI.TextBlock();
  labelText.text = `${label}:`;
  labelText.width = labelWidth;
  labelText.height = '24px';
  labelText.color = '#c5e8ff';
  labelText.fontSize = 14;
  labelText.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

  const valueText = new runtime.BABYLON.GUI.TextBlock();
  valueText.text = 'n/a';
  valueText.height = '24px';
  valueText.color = '#ffffff';
  valueText.fontSize = 14;
  valueText.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  valueText.textWrapping = true;

  row.addControl(labelText);
  row.addControl(valueText);
  parent.addControl(row);

  return valueText;
}

/** Создаёт и настраивает `createSection` в ходе выполнения связанного игрового сценария. */
function createSection(runtime, titleText) {
  const section = new runtime.BABYLON.GUI.Rectangle();
  section.thickness = 1;
  section.cornerRadius = 4;
  section.color = '#5d84a8';
  section.background = '#0e2438cc';
  section.paddingTop = '6px';
  section.paddingLeft = '8px';
  section.paddingRight = '8px';
  section.paddingBottom = '6px';

  const content = new runtime.BABYLON.GUI.StackPanel();
  content.isVertical = true;
  content.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  section.addControl(content);

  const title = new runtime.BABYLON.GUI.TextBlock();
  title.text = titleText;
  title.height = '24px';
  title.color = '#ffffff';
  title.fontSize = 15;
  title.fontWeight = 'bold';
  title.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  content.addControl(title);

  return { section, content };
}

/** Создаёт и настраивает `createActionButton` в ходе выполнения связанного игрового сценария. */
function createActionButton(runtime, label, onClick, options = {}) {
  const { onPointerInteraction = () => {} } = options;
  const button = new runtime.BABYLON.GUI.Rectangle();
  button.width = '100%';
  button.height = '32px';
  button.thickness = 1;
  button.cornerRadius = 4;
  button.color = '#e7f7ff';
  button.background = '#2e4961cc';
  button.isPointerBlocker = true;

  const buttonText = new runtime.BABYLON.GUI.TextBlock();
  buttonText.text = label;
  buttonText.color = '#ffffff';
  buttonText.fontSize = 13;
  button.addControl(buttonText);

  const handlePointerInteraction = () => {
    onPointerInteraction?.();
  };

  button.onPointerDownObservable.add(() => {
    handlePointerInteraction();
    if (!button.isEnabled) {
      return;
    }
    onClick?.();
  });
  button.onPointerUpObservable.add(handlePointerInteraction);

  return { button, buttonText };
}

/** Выполняет `formatUnitResources` в ходе выполнения связанного игрового сценария. */
function formatUnitResources(unit) {
  if (!unit) {
    return 'HP n/a | AP n/a | MP n/a';
  }

  return `HP ${unit.hp}/${unit.maxHp} | AP ${unit.ap}/${unit.maxAp} | MP ${unit.mp}/${unit.maxMp}`;
}

/** Создаёт и настраивает `createCombatDebugHud` в ходе выполнения связанного игрового сценария. */
export function createCombatDebugHud(runtime, options = {}) {
  const { combatState } = options;

  runtime[HUD_RUNTIME_KEY]?.dispose?.();

  const texture = runtime.BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('combatDebugHud', true, runtime.scene);

  const rootPanel = new runtime.BABYLON.GUI.Rectangle();
  rootPanel.width = '460px';
  rootPanel.height = '450px';
  rootPanel.cornerRadius = 8;
  rootPanel.thickness = 1;
  rootPanel.color = '#9bc9ff';
  rootPanel.background = '#081b2dcc';
  rootPanel.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  rootPanel.verticalAlignment = runtime.BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  rootPanel.left = '12px';
  rootPanel.top = '12px';
  rootPanel.paddingTop = '10px';
  rootPanel.paddingLeft = '10px';
  rootPanel.paddingRight = '10px';
  rootPanel.paddingBottom = '10px';
  rootPanel.isPointerBlocker = true;
  texture.addControl(rootPanel);

  const layout = new runtime.BABYLON.GUI.Grid();
  layout.addRowDefinition(0.22);
  layout.addRowDefinition(0.2);
  layout.addRowDefinition(0.33);
  layout.addRowDefinition(0.25);
  layout.addColumnDefinition(1);
  rootPanel.addControl(layout);

  const headerSection = createSection(runtime, 'State');
  layout.addControl(headerSection.section, 0, 0);
  const modeValue = createValueRow(runtime, headerSection.content, 'Current mode', { labelWidth: '160px' });
  const stateValue = createValueRow(runtime, headerSection.content, 'Combat state', { labelWidth: '160px' });
  const roundValue = createValueRow(runtime, headerSection.content, 'Current round', { labelWidth: '160px' });

  const statsSection = createSection(runtime, 'Units');
  layout.addControl(statsSection.section, 1, 0);
  const activeUnitValue = createValueRow(runtime, statsSection.content, 'Active unit', { labelWidth: '140px' });
  const turnOwnerValue = createValueRow(runtime, statsSection.content, 'Turn owner', { labelWidth: '140px' });
  const playerValue = createValueRow(runtime, statsSection.content, 'Player', { labelWidth: '140px' });
  const enemyValue = createValueRow(runtime, statsSection.content, 'Enemy', { labelWidth: '140px' });

  const infoSection = createSection(runtime, 'Combat Info');
  layout.addControl(infoSection.section, 2, 0);
  const phaseValue = createValueRow(runtime, infoSection.content, 'Combat phase', { labelWidth: '150px' });
  const actionModeValue = createValueRow(runtime, infoSection.content, 'Action mode', { labelWidth: '150px' });
  const selectedTargetValue = createValueRow(runtime, infoSection.content, 'Selected target', { labelWidth: '150px' });
  const actionResultValue = createValueRow(runtime, infoSection.content, 'Last action', { labelWidth: '150px' });

  const actionSection = createSection(runtime, 'Actions');
  layout.addControl(actionSection.section, 3, 0);
  const actionGrid = new runtime.BABYLON.GUI.Grid();
  actionGrid.height = '76px';
  actionGrid.addRowDefinition(0.5);
  actionGrid.addRowDefinition(0.5);
  actionGrid.addColumnDefinition(0.5);
  actionGrid.addColumnDefinition(0.5);
  actionSection.content.addControl(actionGrid);

  const onHudPointerInteraction = () => {
    combatState.notifyUiInteraction?.('combat_hud_button');
  };

  const idleButton = createActionButton(runtime, 'Idle mode', () => combatState.setInputMode?.('idle'), {
    onPointerInteraction: onHudPointerInteraction
  });
  const moveButton = createActionButton(runtime, 'Move mode', () => combatState.setInputMode?.('move'), {
    onPointerInteraction: onHudPointerInteraction
  });
  const attackButton = createActionButton(runtime, 'Attack mode', () => combatState.setInputMode?.('attack'), {
    onPointerInteraction: onHudPointerInteraction
  });
  const endTurnButton = createActionButton(runtime, 'End Turn', () => combatState.endActiveTurn?.(), {
    onPointerInteraction: onHudPointerInteraction
  });
  actionGrid.addControl(idleButton.button, 0, 0);
  actionGrid.addControl(moveButton.button, 0, 1);
  actionGrid.addControl(attackButton.button, 1, 0);
  actionGrid.addControl(endTurnButton.button, 1, 1);

  const setButtonState = () => {
    const mode = combatState.inputMode ?? 'idle';
    const availability = combatState.actionAvailability ?? {};
    idleButton.button.background = mode === 'idle' ? '#2f6f7ddd' : '#2e4961cc';
    moveButton.button.background = mode === 'move' ? '#2f7d42dd' : '#2e4961cc';
    attackButton.button.background = mode === 'attack' ? '#964040dd' : '#2e4961cc';
    endTurnButton.button.background = '#4f5a91dd';

    idleButton.button.isEnabled = true;
    moveButton.button.isEnabled = Boolean(availability.canMove);
    attackButton.button.isEnabled = Boolean(availability.canAttack);
    endTurnButton.button.isEnabled = Boolean(availability.canEndTurn);
  };

  const formatActionResult = (result) => {
    if (!result) {
      return 'n/a';
    }

    if (!result.success) {
      return result.reason ?? 'failed';
    }

    if (result.action === 'basic_attack') {
      return `${result.attackerId} hit ${result.targetId} for ${result.damage}`;
    }

    if (result.action === 'move') {
      return `${result.unitId} moved (${result.pathCost} MP)`;
    }

    return result.action ?? 'ok';
  };

  const render = () => {
    const activeUnit = combatState.getActiveUnit?.() ?? null;
    const turnOwner = activeUnit?.team ?? combatState.turn?.activeTeam ?? 'n/a';

    modeValue.text = combatState.mode ?? 'combat';
    stateValue.text = combatState.status ?? 'n/a';
    roundValue.text = `${combatState.turn?.roundNumber ?? 'n/a'}`;
    activeUnitValue.text = activeUnit ? `${activeUnit.id} (${activeUnit.team})` : 'n/a';
    turnOwnerValue.text = turnOwner;
    playerValue.text = formatUnitResources(combatState.units?.player);
    enemyValue.text = formatUnitResources(combatState.units?.enemy);
    phaseValue.text = combatState.phase ?? combatState.turn?.phase ?? 'n/a';
    actionModeValue.text = combatState.inputMode ?? 'idle';
    selectedTargetValue.text = combatState.selectedTargetId ?? 'n/a';
    actionResultValue.text = formatActionResult(combatState.lastActionResult);

    setButtonState();
  };

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(render);
  render();

  const controller = {
    setVisible: (visible) => {
      rootPanel.isVisible = visible;
    },
    dispose: () => {
      runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
      texture.dispose();

      if (runtime[HUD_RUNTIME_KEY] === controller) {
        delete runtime[HUD_RUNTIME_KEY];
      }
    }
  };

  runtime[HUD_RUNTIME_KEY] = controller;
  return controller;
}
