function isDescendantOf(node, possibleAncestor) {
  let current = node;
  while (current) {
    if (current === possibleAncestor) {
      return true;
    }
    current = current.parent ?? null;
  }

  return false;
}

export function attachCombatAttackInputController(runtime, options = {}) {
  const {
    combatState,
    attackerUnit,
    targetUnit,
    targetRoot,
    isAttackEnabled = () => true
  } = options;

  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    if (combatState.status !== 'active' || !targetUnit?.isAlive) {
      return;
    }

    if (!isAttackEnabled()) {
      return;
    }

    const pickResult = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    if (!pickResult?.hit || !pickResult.pickedMesh) {
      return;
    }

    const hitTarget = pickResult.pickedMesh === targetRoot || isDescendantOf(pickResult.pickedMesh, targetRoot);
    if (!hitTarget) {
      return;
    }

    combatState.tryBasicAttack({ attackerId: attackerUnit.id, targetId: targetUnit.id });
  });

  return () => {
    runtime.scene.onPointerObservable.remove(pointerObserver);
  };
}
