export function createDefaultPlayer(seed = {}) {
  return {
    id: seed.id || 'player',
    name: seed.name || 'Player',
    hp: seed.hp || { current: 100, max: 100 },
    energy: seed.energy || { current: 100, max: 100 },
    skills: seed.skills || {},
    professions: seed.professions || [],
    currentNodeId: seed.currentNodeId || 'building:rowan-flat-2b',
    homeNodeId: seed.homeNodeId || 'building:rowan-flat-2b',
    resources: {
      cash: seed.resources?.cash ?? 0,
      transitCredits: seed.resources?.transitCredits ?? 0
    },
    carryCapacityWeight: seed.carryCapacityWeight || 40,
    inventory: { items: seed.inventory?.items || [] },
    equipped: seed.equipped || {},
    relationships: seed.relationships || {}
  };
}
