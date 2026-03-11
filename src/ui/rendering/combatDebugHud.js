function createValueRow(runtime, parent, label) {
  const row = new runtime.BABYLON.GUI.StackPanel();
  row.isVertical = false;
  row.height = '24px';
  row.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

  const labelText = new runtime.BABYLON.GUI.TextBlock();
  labelText.text = `${label}:`;
  labelText.width = '180px';
  labelText.height = '24px';
  labelText.color = '#c5e8ff';
  labelText.fontSize = 15;
  labelText.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

  const valueText = new runtime.BABYLON.GUI.TextBlock();
  valueText.text = 'n/a';
  valueText.height = '24px';
  valueText.color = '#ffffff';
  valueText.fontSize = 15;
  valueText.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;

  row.addControl(labelText);
  row.addControl(valueText);
  parent.addControl(row);

  return valueText;
}

function createActionButton(runtime, label, onClick) {
  const button = new runtime.BABYLON.GUI.Rectangle();
  button.width = '120px';
  button.height = '42px';
  button.thickness = 1;
  button.cornerRadius = 4;
  button.color = '#e7f7ff';
  button.background = '#2e4961cc';

  const buttonText = new runtime.BABYLON.GUI.TextBlock();
  buttonText.text = label;
  buttonText.color = '#ffffff';
  buttonText.fontSize = 14;
  button.addControl(buttonText);

  button.onPointerDownObservable.add(() => {
    onClick?.();
  });

  return { button, buttonText };
}

function formatUnitResources(unit) {
  if (!unit) {
    return 'HP n/a | AP n/a | MP n/a';
  }

  return `HP ${unit.hp}/${unit.maxHp} | AP ${unit.ap}/${unit.maxAp} | MP ${unit.mp}/${unit.maxMp}`;
}

export function createCombatDebugHud(runtime, options = {}) {
  const { combatState } = options;

  const texture = runtime.BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI('combatDebugHud', true, runtime.scene);

  const rootPanel = new runtime.BABYLON.GUI.Rectangle();
  rootPanel.width = '420px';
  rootPanel.height = '430px';
  rootPanel.cornerRadius = 8;
  rootPanel.thickness = 1;
  rootPanel.color = '#9bc9ff';
  rootPanel.background = '#081b2dcc';
  rootPanel.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  rootPanel.verticalAlignment = runtime.BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
  rootPanel.left = '12px';
  rootPanel.top = '12px';
  texture.addControl(rootPanel);

  const content = new runtime.BABYLON.GUI.StackPanel();
  content.paddingTop = '10px';
  content.paddingLeft = '10px';
  content.paddingRight = '10px';
  content.isVertical = true;
  content.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  rootPanel.addControl(content);

  const title = new runtime.BABYLON.GUI.TextBlock();
  title.text = 'Combat Debug HUD';
  title.height = '28px';
  title.color = '#ffffff';
  title.fontSize = 18;
  title.fontWeight = 'bold';
  title.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  content.addControl(title);

  const modeValue = createValueRow(runtime, content, 'Current mode');
  const stateValue = createValueRow(runtime, content, 'Combat state');
  const roundValue = createValueRow(runtime, content, 'Current round');
  const activeUnitValue = createValueRow(runtime, content, 'Active unit id/name');
  const turnOwnerValue = createValueRow(runtime, content, 'Turn owner');
  const playerValue = createValueRow(runtime, content, 'Player HP/AP/MP');
  const enemyValue = createValueRow(runtime, content, 'Enemy HP/AP/MP');
  const phaseValue = createValueRow(runtime, content, 'Combat phase');
  const actionModeValue = createValueRow(runtime, content, 'Action mode');
  const selectedTargetValue = createValueRow(runtime, content, 'Selected target');
  const actionResultValue = createValueRow(runtime, content, 'Last action result');

  const actionSectionTitle = new runtime.BABYLON.GUI.TextBlock();
  actionSectionTitle.text = 'Actions';
  actionSectionTitle.height = '30px';
  actionSectionTitle.color = '#c5e8ff';
  actionSectionTitle.fontSize = 16;
  actionSectionTitle.fontWeight = 'bold';
  actionSectionTitle.textHorizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  content.addControl(actionSectionTitle);

  const actionRow = new runtime.BABYLON.GUI.StackPanel();
  actionRow.isVertical = false;
  actionRow.height = '50px';
  actionRow.horizontalAlignment = runtime.BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  content.addControl(actionRow);

  const moveButton = createActionButton(runtime, 'Move mode', () => combatState.setInputMode?.('move'));
  const attackButton = createActionButton(runtime, 'Attack mode', () => combatState.setInputMode?.('attack'));
  const endTurnButton = createActionButton(runtime, 'End Turn', () => combatState.endActiveTurn?.());
  actionRow.addControl(moveButton.button);
  actionRow.addControl(attackButton.button);
  actionRow.addControl(endTurnButton.button);

  const setButtonState = () => {
    const mode = combatState.inputMode ?? 'move';
    moveButton.button.background = mode === 'move' ? '#2f7d42dd' : '#2e4961cc';
    attackButton.button.background = mode === 'attack' ? '#964040dd' : '#2e4961cc';
    endTurnButton.button.background = '#4f5a91dd';
  };

  const render = () => {
    const activeUnit = combatState.getActiveUnit?.() ?? null;
    const turnOwner = activeUnit?.team ?? combatState.turn?.activeTeam ?? 'n/a';

    modeValue.text = combatState.mode ?? 'combat';
    stateValue.text = combatState.status ?? 'n/a';
    roundValue.text = `${combatState.turn?.round ?? 'n/a'}`;
    activeUnitValue.text = activeUnit ? `${activeUnit.id} (${activeUnit.team})` : 'n/a';
    turnOwnerValue.text = turnOwner;
    playerValue.text = formatUnitResources(combatState.units?.player);
    enemyValue.text = formatUnitResources(combatState.units?.enemy);
    phaseValue.text = combatState.phase ?? combatState.turn?.phase ?? 'n/a';
    actionModeValue.text = combatState.inputMode ?? 'move';
    selectedTargetValue.text = combatState.selectedTargetId ?? 'n/a';
    actionResultValue.text = combatState.lastActionResult?.success
      ? `${combatState.lastActionResult.action} hit ${combatState.lastActionResult.targetId} for ${combatState.lastActionResult.damage}`
      : (combatState.lastActionResult?.reason ?? 'n/a');

    setButtonState();
  };

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(render);
  render();

  return () => {
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
    texture.dispose();
  };
}
