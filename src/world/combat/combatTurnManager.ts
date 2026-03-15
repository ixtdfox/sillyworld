// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 * Фокус файла — пошаговый бой: клетки, действия, очередь ходов и управление вводом в бою.
 */
const DEFAULT_INITIATIVE = 0;

/**
 * Управляет очередностью ходов в пошаговом бою.
 * Класс подготавливает упорядоченный список участников, отслеживает активного юнита,
 * номер раунда и текущую фазу боя, чтобы остальные подсистемы работали
 * с единым и детерминированным состоянием.
 */
export class CombatTurnManager {
  state;

  constructor(units = []) {
    const orderedUnits = this.normalizeUnits(units);
    this.assertHasUnits(orderedUnits);

    this.state = {
      phase: 'combat_start',
      roundNumber: 1,
      orderedUnits,
      activeUnitIndex: 0,
      turnsTakenThisRound: 0
    };
  }

  /**
   * Приводит список участников к формату очереди ходов.
   * Фиксирует инициативу и добавляет временный tie-breaker,
   * чтобы порядок оставался стабильным даже при равных значениях инициативы.
   */
  normalizeUnits(units = []) {
    return [...units]
        .map((unit, index) => ({
          unitId: unit.id,
          team: unit.team,
          initiative: Number.isFinite(unit.initiative)
              ? unit.initiative
              : DEFAULT_INITIATIVE,
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

  /**
   * Проверяет, что менеджер очереди не создаётся без участников боя.
   * Без хотя бы одного юнита конечный автомат хода не имеет смысла.
   */
  assertHasUnits(orderedUnits) {
    if (!orderedUnits.length) {
      throw new Error('[SillyRPG] Combat turn manager requires at least one combatant.');
    }
  }

  /**
   * Возвращает текущего активного участника очереди.
   * Используется другими подсистемами, чтобы понять, чей сейчас ход.
   */
  getActiveUnit() {
    return this.state.orderedUnits[this.state.activeUnitIndex] ?? null;
  }

  /**
   * Возвращает снимок текущего состояния менеджера ходов.
   * Снапшот нужен как безопасное представление состояния для HUD, ввода и боевой логики.
   */
  getState() {
    return {
      phase: this.state.phase,
      roundNumber: this.state.roundNumber,
      orderedUnits: this.state.orderedUnits.map((unit) => ({ ...unit })),
      activeUnitIndex: this.state.activeUnitIndex,
      activeUnitId: this.getActiveUnit()?.unitId ?? null
    };
  }

  /**
   * Переводит менеджер в начальное состояние боя.
   * Сбрасывает раунд, активного юнита и счётчик завершённых ходов в текущем раунде.
   */
  startCombat() {
    this.state.phase = 'turn_start';
    this.state.roundNumber = 1;
    this.state.activeUnitIndex = 0;
    this.state.turnsTakenThisRound = 0;
    return this.getState();
  }

  /**
   * Переводит текущий ход в активную фазу,
   * когда выбранный юнит уже может выполнять действия.
   */
  startTurn() {
    this.state.phase = 'turn_active';
    return this.getState();
  }

  /**
   * Завершает ход активного юнита
   * и увеличивает счётчик ходов, завершённых в рамках текущего раунда.
   */
  endTurn() {
    this.state.phase = 'turn_end';
    this.state.turnsTakenThisRound += 1;
    return this.getState();
  }

  /**
   * Переключает очередь на следующего юнита.
   * Если текущий участник был последним в очереди, начинает новый раунд
   * и возвращает управление первому юниту в отсортированном списке.
   */
  advanceToNextUnit() {
    const nextIndex = this.state.activeUnitIndex + 1;
    const completedRound = nextIndex >= this.state.orderedUnits.length;

    if (completedRound) {
      this.state.roundNumber += 1;
      this.state.activeUnitIndex = 0;
      this.state.turnsTakenThisRound = 0;
      this.state.phase = 'round_start';
      return this.getState();
    }

    this.state.activeUnitIndex = nextIndex;
    this.state.phase = 'turn_start';
    return this.getState();
  }
}

/**
 * Создаёт экземпляр менеджера очереди ходов.
 * Оставлено как совместимый фабричный слой для кода,
 * который пока использует функциональный способ создания менеджера.
 */
export function createCombatTurnManager(units = []) {
  return new CombatTurnManager(units);
}