const DEFAULT_INITIATIVE = 0;

function normalizeUnits(units = []) {
  return [...units]
    .map((unit, index) => ({
      unitId: unit.id,
      team: unit.team,
      initiative: Number.isFinite(unit.initiative) ? unit.initiative : DEFAULT_INITIATIVE,
      tieBreaker: index
    }))
    .sort((a, b) => {
      if (b.initiative !== a.initiative) {
        return b.initiative - a.initiative;
      }

      if (a.team !== b.team) {
        return a.team.localeCompare(b.team);
      }

      return a.tieBreaker - b.tieBreaker;
    })
    .map(({ tieBreaker, ...unit }) => unit);
}

function assertHasUnits(orderedUnits) {
  if (!orderedUnits.length) {
    throw new Error('[SillyRPG] Combat turn manager requires at least one combatant.');
  }
}

export function createCombatTurnManager(units = []) {
  const orderedUnits = normalizeUnits(units);
  assertHasUnits(orderedUnits);

  const state = {
    phase: 'combat_start',
    roundNumber: 1,
    orderedUnits,
    activeUnitIndex: 0,
    turnsTakenThisRound: 0
  };

  const getActiveUnit = () => state.orderedUnits[state.activeUnitIndex] ?? null;

  const snapshot = () => ({
    phase: state.phase,
    roundNumber: state.roundNumber,
    orderedUnits: state.orderedUnits.map((unit) => ({ ...unit })),
    activeUnitIndex: state.activeUnitIndex,
    activeUnitId: getActiveUnit()?.unitId ?? null
  });

  const startCombat = () => {
    state.phase = 'turn_start';
    state.roundNumber = 1;
    state.activeUnitIndex = 0;
    state.turnsTakenThisRound = 0;
    return snapshot();
  };

  const startTurn = () => {
    state.phase = 'turn_active';
    return snapshot();
  };

  const endTurn = () => {
    state.phase = 'turn_end';
    state.turnsTakenThisRound += 1;
    return snapshot();
  };

  const advanceToNextUnit = () => {
    const nextIndex = state.activeUnitIndex + 1;
    const completedRound = nextIndex >= state.orderedUnits.length;

    if (completedRound) {
      state.roundNumber += 1;
      state.activeUnitIndex = 0;
      state.turnsTakenThisRound = 0;
      state.phase = 'round_start';
      return snapshot();
    }

    state.activeUnitIndex = nextIndex;
    state.phase = 'turn_start';
    return snapshot();
  };

  return {
    getState: snapshot,
    getActiveUnit,
    startCombat,
    startTurn,
    endTurn,
    advanceToNextUnit
  };
}
