import { attachCombatTargetSelectionFlow } from './combatTargetSelectionFlow.ts';

function resolveTargetEntries(options = {}) {
  if (typeof options.getPotentialTargets === 'function') {
    return options.getPotentialTargets().map((entry) => ({
      unit: entry.unit,
      targetRoot: entry.targetRoot
    }));
  }

  if (options.targetUnit && options.targetRoot) {
    return [{
      unit: options.targetUnit,
      targetRoot: options.targetRoot
    }];
  }

  return [];
}

export function attachCombatAttackInputController(runtime, options = {}) {
  const {
    combatState,
    attackerUnit,
    isAttackEnabled = () => true
  } = options;

  const detachTargetSelectionFlow = attachCombatTargetSelectionFlow(runtime, {
    getTargetEntries: () => resolveTargetEntries(options),
    isEnabled: () => {
      const activeUnit = combatState.getActiveUnit?.() ?? null;
      return combatState.status === 'active'
        && isAttackEnabled()
        && activeUnit?.id === attackerUnit.id;
    },
    onSelectionChanged: (entry) => {
      combatState.selectedTargetId = entry?.unit?.id ?? null;
    },
    onTargetConfirmed: (entry) => {
      const targetId = entry?.unit?.id;
      if (!targetId) {
        return;
      }

      const result = combatState.tryBasicAttack({
        attackerId: attackerUnit.id,
        targetId
      });
      combatState.lastActionResult = result;
    }
  });

  return () => {
    detachTargetSelectionFlow?.();
  };
}
