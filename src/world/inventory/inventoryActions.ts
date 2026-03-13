import type { EquipmentSlot, GameState } from '../contracts.ts';
import { canTakeItem } from './inventorySelectors.ts';

interface InventoryActionResult {
  state: GameState;
  ok: boolean;
}

export function addItemToPlayer(state: GameState, instanceId: string): InventoryActionResult {
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

export function removeItemFromPlayer(state: GameState, instanceId: string): GameState {
  const nextInventory = state.player.inventory.items.filter((id) => id !== instanceId);
  const nextEquipped = Object.fromEntries(
    Object.entries(state.player.equipped).filter(([, value]) => value !== instanceId)
  ) as GameState['player']['equipped'];

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

export function moveItemToSlot(state: GameState, instanceId: string, slotId: EquipmentSlot | string): InventoryActionResult {
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

export function unequipSlot(state: GameState, slotId: EquipmentSlot | string): GameState {
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
