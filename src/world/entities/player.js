export function createDefaultPlayer(seed = {}) {
  return {
    id: seed.id || 'player',
    name: seed.name || 'Player',
    hp: seed.hp || { current: 100, max: 100 },
    energy: seed.energy || { current: 100, max: 100 },
    skills: seed.skills || {},
    professions: seed.professions || [],
    carryCapacityWeight: seed.carryCapacityWeight || 40,
    inventory: { items: seed.inventory?.items || [] },
    equipped: seed.equipped || {},
    relationships: seed.relationships || {}
  };
}
