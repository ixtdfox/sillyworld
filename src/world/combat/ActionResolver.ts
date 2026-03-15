// @ts-nocheck
// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей.
 * Фокус файла — пошаговый бой: клетки, действия, очередь ходов и управление вводом в бою.
 */
import { Cell } from '../spatial/cell/Cell.ts';

const DEFAULT_BASIC_ATTACK_AP_COST = 1;
const DEFAULT_BASIC_ATTACK_RANGE = 1;
const DEFAULT_BASIC_ATTACK_DAMAGE = 4;

/**
 * Обрабатывает боевые действия в пошаговом режиме.
 * Класс инкапсулирует правила валидации и применения базовой атаки,
 * а также умеет определять завершение боя по составу живых команд.
 */
export class ActionResolver {
  basicAttackApCost;
  basicAttackDamage;

  constructor(options = {}) {
    this.basicAttackApCost = options.basicAttackApCost ?? DEFAULT_BASIC_ATTACK_AP_COST;
    this.basicAttackDamage = options.basicAttackDamage ?? DEFAULT_BASIC_ATTACK_DAMAGE;
  }

  /**
   * Проверяет, что юнит ещё участвует в бою:
   * не помечен как погибший и имеет HP выше нуля.
   */
  isUnitAlive(unit) {
    return Boolean(unit) && unit.isAlive !== false && Number(unit.hp) > 0;
  }

  /**
   * Проводит полную валидацию обычной атаки до изменения состояния боя.
   * Проверяет наличие юнитов, очередь хода, принадлежность к команде,
   * запас AP и достижимость цели по манхэттенской дистанции.
   */
  validateBasicAttack({ attacker, target, activeUnitId }) {
    if (!attacker || !target) {
      return { valid: false, reason: 'missing_unit' };
    }

    if (!this.isUnitAlive(attacker)) {
      return { valid: false, reason: 'attacker_dead' };
    }

    if (!this.isUnitAlive(target)) {
      return { valid: false, reason: 'target_dead' };
    }

    if (activeUnitId !== attacker.id) {
      return { valid: false, reason: 'not_attackers_turn' };
    }

    if (attacker.team === target.team) {
      return { valid: false, reason: 'invalid_target_team' };
    }

    if (attacker.ap < this.basicAttackApCost) {
      return { valid: false, reason: 'insufficient_ap' };
    }

    const attackRange = Number.isFinite(attacker.attackRange)
        ? attacker.attackRange
        : DEFAULT_BASIC_ATTACK_RANGE;

    const distance = Cell.from(attacker.gridCell).manhattanDistanceTo(target.gridCell);

    if (distance > attackRange) {
      return {
        valid: false,
        reason: 'target_out_of_range',
        details: { distance, attackRange }
      };
    }

    return {
      valid: true,
      details: { distance, attackRange }
    };
  }

  /**
   * Применяет базовую атаку к цели после успешной валидации.
   * Списывает AP у атакующего, уменьшает HP цели и,
   * если нужно, помечает цель погибшей.
   */
  resolveBasicAttack({ attacker, target, activeUnitId }) {
    const validation = this.validateBasicAttack({
      attacker,
      target,
      activeUnitId
    });

    if (!validation.valid) {
      return {
        success: false,
        reason: validation.reason,
        details: validation.details ?? null
      };
    }

    attacker.ap -= this.basicAttackApCost;

    const damage = Number.isFinite(attacker.attackPower)
        ? attacker.attackPower
        : this.basicAttackDamage;

    target.hp = Math.max(0, target.hp - damage);

    if (target.hp <= 0) {
      target.isAlive = false;
    }

    return {
      success: true,
      action: 'basic_attack',
      apCost: this.basicAttackApCost,
      damage,
      attackerId: attacker.id,
      targetId: target.id,
      targetHp: target.hp,
      targetDied: target.isAlive === false
    };
  }

  /**
   * Определяет, завершён ли бой.
   * Бой считается завершённым, когда все живые юниты одной из сторон выбыли.
   */
  evaluateCombatOutcome(units = []) {
    const livingPlayers = units.filter(
        (unit) => unit.team === 'player' && this.isUnitAlive(unit)
    );

    const livingEnemies = units.filter(
        (unit) => unit.team === 'enemy' && this.isUnitAlive(unit)
    );

    if (livingPlayers.length === 0) {
      return { ended: true, result: 'defeat' };
    }

    if (livingEnemies.length === 0) {
      return { ended: true, result: 'victory' };
    }

    return { ended: false, result: null };
  }
}

/**
 * Создаёт экземпляр обработчика боевых действий.
 * Оставлено как совместимый фабричный слой, если остальной код проекта
 * пока ожидает создание резолвера через функцию.
 */
export function createCombatActionResolver(options = {}) {
  return new ActionResolver(options);
}
