// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
import {manhattanDistance} from "./math/utils.ts";

const DEFAULT_BASIC_ATTACK_AP_COST = 1;
const DEFAULT_BASIC_ATTACK_RANGE = 1;
const DEFAULT_BASIC_ATTACK_DAMAGE = 4;

/** Проверяет, что юнит ещё участвует в бою: имеет HP выше нуля и не помечен как погибший. */
function isUnitAlive(unit) {
  return Boolean(unit) && unit.isAlive !== false && Number(unit.hp) > 0;
}

/**
 * Проводит полную валидацию обычной атаки до изменения состояния боя.
 * Проверяет очередь хода, команду цели, AP и дистанцию по клеткам, чтобы UI мог показать причину отказа.
 */
function validateBasicAttack({ attacker, target, activeUnitId, apCost = DEFAULT_BASIC_ATTACK_AP_COST }) {
  if (!attacker || !target) {
    return { valid: false, reason: 'missing_unit' };
  }

  if (!isUnitAlive(attacker)) {
    return { valid: false, reason: 'attacker_dead' };
  }

  if (!isUnitAlive(target)) {
    return { valid: false, reason: 'target_dead' };
  }

  if (activeUnitId !== attacker.id) {
    return { valid: false, reason: 'not_attackers_turn' };
  }

  if (attacker.team === target.team) {
    return { valid: false, reason: 'invalid_target_team' };
  }

  if (attacker.ap < apCost) {
    return { valid: false, reason: 'insufficient_ap' };
  }

  const attackRange = Number.isFinite(attacker.attackRange) ? attacker.attackRange : DEFAULT_BASIC_ATTACK_RANGE;
  const distance = manhattanDistance(attacker.gridCell, target.gridCell);
  if (distance > attackRange) {
    return { valid: false, reason: 'target_out_of_range', details: { distance, attackRange } };
  }

  return { valid: true, details: { distance, attackRange } };
}

/**
 * Определяет, завершён ли бой по составу живых команд.
 * Возвращает победу/поражение, когда одна из сторон полностью выбыла.
 */
function evaluateCombatOutcome(units = []) {
  const livingPlayers = units.filter((unit) => unit.team === 'player' && isUnitAlive(unit));
  const livingEnemies = units.filter((unit) => unit.team === 'enemy' && isUnitAlive(unit));

  if (livingPlayers.length === 0) {
    return { ended: true, result: 'defeat' };
  }

  if (livingEnemies.length === 0) {
    return { ended: true, result: 'victory' };
  }

  return { ended: false, result: null };
}

/**
 * Создаёт обработчик боевых действий для пошагового режима.
 * Инкапсулирует проверку и применение базовой атаки: списывает AP атакующего,
 * уменьшает HP цели и отдаёт структурированный результат для HUD и логов боя.
 */
export function createCombatActionResolver(options = {}) {
  const basicAttackApCost = options.basicAttackApCost ?? DEFAULT_BASIC_ATTACK_AP_COST;
  const basicAttackDamage = options.basicAttackDamage ?? DEFAULT_BASIC_ATTACK_DAMAGE;

  const resolveBasicAttack = ({ attacker, target, activeUnitId }) => {
    const validation = validateBasicAttack({
      attacker,
      target,
      activeUnitId,
      apCost: basicAttackApCost
    });

    if (!validation.valid) {
      return {
        success: false,
        reason: validation.reason,
        details: validation.details ?? null
      };
    }

    attacker.ap -= basicAttackApCost;

    const damage = Number.isFinite(attacker.attackPower) ? attacker.attackPower : basicAttackDamage;
    target.hp = Math.max(0, target.hp - damage);
    if (target.hp <= 0) {
      target.isAlive = false;
    }

    return {
      success: true,
      action: 'basic_attack',
      apCost: basicAttackApCost,
      damage,
      attackerId: attacker.id,
      targetId: target.id,
      targetHp: target.hp,
      targetDied: target.isAlive === false
    };
  };

  return {
    validateBasicAttack,
    resolveBasicAttack,
    evaluateCombatOutcome
  };
}

export { evaluateCombatOutcome, validateBasicAttack };
