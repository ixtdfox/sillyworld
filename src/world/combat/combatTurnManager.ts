// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
const DEFAULT_INITIATIVE = 0;

/**
 * Готовит список участников для очереди ходов: фиксирует инициативу и стабильный tie-breaker.
 * Сортировка нужна, чтобы порядок хода был детерминирован даже при равной инициативе.
 */
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

/** Защищает менеджер от некорректного запуска боя без участников. */
function assertHasUnits(orderedUnits) {
  if (!orderedUnits.length) {
    throw new Error('[SillyRPG] Combat turn manager requires at least one combatant.');
  }
}

/**
 * Создаёт конечный автомат очередности боя.
 * Хранит номер раунда, активного юнита и фазу шага, чтобы остальные подсистемы
 * (ввод, HUD, резолвер действий) синхронно работали с одним источником правды.
 */
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
