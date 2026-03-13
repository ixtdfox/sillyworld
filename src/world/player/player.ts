import type { PlayerState, RelationshipState } from '../contracts.ts';

type RelationshipEntrySeed = Partial<RelationshipState>;

function normalizeRelationshipEntry(relationship: RelationshipEntrySeed = {}): RelationshipState {
  return {
    level: typeof relationship.level === 'number' && Number.isFinite(relationship.level) ? relationship.level : 0,
    tags: Array.isArray(relationship.tags) ? relationship.tags : [],
    stance: relationship.stance ?? 'neutral',
    axes: {
      trust: relationship.axes?.trust ?? 0,
      fear: relationship.axes?.fear ?? 0,
      guilt: relationship.axes?.guilt ?? 0,
      affection: relationship.axes?.affection ?? 0,
      resentment: relationship.axes?.resentment ?? 0,
      officialNarrativeLoyalty: relationship.axes?.officialNarrativeLoyalty ?? 0
    },
    flags: relationship.flags ?? {},
    history: Array.isArray(relationship.history) ? relationship.history : [],
    lastInteractionAt: relationship.lastInteractionAt ?? null
  };
}

function normalizeRelationships(relationships: PlayerState['relationships'] = {}): PlayerState['relationships'] {
  return Object.fromEntries(
    Object.entries(relationships).map(([characterId, relationship]) => [
      characterId,
      normalizeRelationshipEntry(relationship)
    ])
  );
}

export function createDefaultPlayer(seed: Partial<PlayerState> = {}): PlayerState {
  return {
    id: seed.id ?? 'player',
    name: seed.name ?? 'Player',
    hp: seed.hp ?? { current: 100, max: 100 },
    energy: seed.energy ?? { current: 100, max: 100 },
    skills: seed.skills ?? {},
    professions: seed.professions ?? [],
    currentNodeId: seed.currentNodeId ?? 'building:rowan-flat-2b',
    homeNodeId: seed.homeNodeId ?? 'building:rowan-flat-2b',
    resources: {
      cash: seed.resources?.cash ?? 0,
      transitCredits: seed.resources?.transitCredits ?? 0
    },
    carryCapacityWeight: seed.carryCapacityWeight ?? 40,
    inventory: { items: seed.inventory?.items ?? [] },
    equipped: seed.equipped ?? {},
    relationships: normalizeRelationships(seed.relationships)
  };
}
