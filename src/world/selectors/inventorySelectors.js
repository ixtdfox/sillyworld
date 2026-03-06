export function getItemInstance(state, instanceId) {
  return state.items.instancesById[instanceId] || null;
}

export function getItemDef(state, defId) {
  return state.items.defsById[defId] || null;
}

export function getInventoryWeight(state) {
  const ids = state.player.inventory.items || [];
  return ids.reduce((sum, instanceId) => {
    const instance = getItemInstance(state, instanceId);
    if (!instance) return sum;
    const def = getItemDef(state, instance.defId);
    if (!def) return sum;
    return sum + def.weight * (instance.qty || 1);
  }, 0);
}

export function canTakeItem(state, itemInstanceId) {
  const item = getItemInstance(state, itemInstanceId);
  if (!item) return false;
  const def = getItemDef(state, item.defId);
  if (!def) return false;
  return getInventoryWeight(state) + def.weight * (item.qty || 1) <= state.player.carryCapacityWeight;
}
