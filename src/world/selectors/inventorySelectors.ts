import type { GameState, ItemDefinitionState, ItemInstanceState } from '../contracts.ts';

export function getItemInstance(state: GameState, instanceId: string): ItemInstanceState | null {
  return state.items.instancesById[instanceId] || null;
}

export function getItemDef(state: GameState, defId: string): ItemDefinitionState | null {
  return state.items.defsById[defId] || null;
}

export function getInventoryWeight(state: GameState): number {
  const ids = state.player.inventory.items || [];
  return ids.reduce((sum, instanceId) => {
    const instance = getItemInstance(state, instanceId);
    if (!instance) return sum;
    const def = getItemDef(state, instance.defId);
    if (!def) return sum;
    return sum + (def.weight || 0) * (instance.qty || 1);
  }, 0);
}

export function canTakeItem(state: GameState, itemInstanceId: string): boolean {
  const item = getItemInstance(state, itemInstanceId);
  if (!item) return false;
  const def = getItemDef(state, item.defId);
  if (!def) return false;
  return getInventoryWeight(state) + (def.weight || 0) * (item.qty || 1) <= state.player.carryCapacityWeight;
}
