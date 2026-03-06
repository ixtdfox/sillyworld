import { canTakeItem } from '../selectors/inventorySelectors.js';

export function addItemToPlayer(state, instanceId) {
  if (!canTakeItem(state, instanceId)) return { state, ok: false };
  return {
    ok: true,
    state: {
      ...state,
      player: {
        ...state.player,
        inventory: {
          ...state.player.inventory,
          items: [...state.player.inventory.items, instanceId]
        }
      },
      updatedAt: Date.now()
    }
  };
}

export function removeItemFromPlayer(state, instanceId) {
  const nextInventory = state.player.inventory.items.filter((id) => id !== instanceId);
  const nextEquipped = Object.fromEntries(Object.entries(state.player.equipped).filter(([, value]) => value !== instanceId));

  return {
    ...state,
    player: {
      ...state.player,
      inventory: { ...state.player.inventory, items: nextInventory },
      equipped: nextEquipped
    },
    updatedAt: Date.now()
  };
}

export function moveItemToSlot(state, instanceId, slotId) {
  if (!state.player.inventory.items.includes(instanceId)) return { state, ok: false };
  return {
    ok: true,
    state: {
      ...state,
      player: {
        ...state.player,
        equipped: {
          ...state.player.equipped,
          [slotId]: instanceId
        }
      },
      updatedAt: Date.now()
    }
  };
}

export function unequipSlot(state, slotId) {
  const nextEquipped = { ...state.player.equipped };
  delete nextEquipped[slotId];
  return {
    ...state,
    player: {
      ...state.player,
      equipped: nextEquipped
    },
    updatedAt: Date.now()
  };
}
