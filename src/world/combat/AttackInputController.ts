// @ts-nocheck
import { attachCombatTargetSelectionFlow } from '../../render/combat/combatTargetSelectionFlow.ts';

/**
 * Контроллер ввода атаки связывает выбор цели в сцене с боевым состоянием.
 * Он включает режим выделения только в те моменты, когда игрок действительно
 * может атаковать, обновляет выбранную цель в combatState и подтверждает атаку
 * через боевой API состояния.
 */
export class AttackInputController {
  #runtime;
  #combatState;
  #attackerUnit;
  #isAttackEnabled;
  #getPotentialTargets;
  #targetUnit;
  #targetRoot;
  #detachTargetSelectionFlow = null;

  constructor(runtime, options = {}) {
    this.#runtime = runtime;
    this.#combatState = options.combatState;
    this.#attackerUnit = options.attackerUnit;
    this.#isAttackEnabled = typeof options.isAttackEnabled === 'function'
        ? options.isAttackEnabled
        : () => true;

    this.#getPotentialTargets = typeof options.getPotentialTargets === 'function'
        ? options.getPotentialTargets
        : null;

    this.#targetUnit = options.targetUnit ?? null;
    this.#targetRoot = options.targetRoot ?? null;
  }

  /**
   * Подключает flow выбора цели к runtime сцены.
   * После attach контроллер начинает синхронизировать выделение и подтверждение цели
   * с combatState, пока не будет вызван dispose().
   */
  attach() {
    if (this.#detachTargetSelectionFlow) {
      return;
    }

    this.#detachTargetSelectionFlow = attachCombatTargetSelectionFlow(this.#runtime, {
      getTargetEntries: () => this.#resolveTargetEntries(),
      isEnabled: () => this.#isEnabled(),
      onSelectionChanged: (entry) => this.#handleSelectionChanged(entry),
      onTargetConfirmed: (entry) => this.#handleTargetConfirmed(entry)
    });
  }

  /**
   * Возвращает список доступных целей для текущего режима атаки.
   * Контроллер поддерживает два сценария:
   * динамическое получение целей через callback и одиночную цель,
   * переданную напрямую через options.
   */
  #resolveTargetEntries() {
    if (this.#getPotentialTargets) {
      return this.#getPotentialTargets().map((entry) => ({
        unit: entry.unit,
        targetRoot: entry.targetRoot
      }));
    }

    if (this.#targetUnit && this.#targetRoot) {
      return [{
        unit: this.#targetUnit,
        targetRoot: this.#targetRoot
      }];
    }

    return [];
  }

  /**
   * Проверяет, может ли контроллер сейчас принимать ввод атаки.
   * Режим включается только во время активного боя, когда атака разрешена
   * внешней логикой и ход принадлежит атакующему юниту.
   */
  #isEnabled() {
    const activeUnit = this.#combatState.getActiveUnit?.() ?? null;

    return this.#combatState.status === 'active'
        && this.#isAttackEnabled()
        && activeUnit?.id === this.#attackerUnit.id;
  }

  /**
   * Синхронизирует выделенную цель с боевым состоянием,
   * чтобы HUD и остальная логика знали, кого игрок собирается атаковать.
   */
  #handleSelectionChanged(entry) {
    this.#combatState.selectedTargetId = entry?.unit?.id ?? null;
  }

  /**
   * Подтверждает атаку по выбранной цели через combatState
   * и сохраняет результат действия для дальнейшей обработки HUD и логов.
   */
  #handleTargetConfirmed(entry) {
    const targetId = entry?.unit?.id;
    if (!targetId) {
      return;
    }

    const result = this.#combatState.tryBasicAttack({
      attackerId: this.#attackerUnit.id,
      targetId
    });

    this.#combatState.lastActionResult = result;
  }

  /**
   * Отключает подписки и освобождает связанные ресурсы контроллера.
   * После dispose контроллер перестаёт реагировать на выбор целей в сцене.
   */
  dispose() {
    this.#detachTargetSelectionFlow?.();
    this.#detachTargetSelectionFlow = null;
  }
}

/**
 * Совместимый фабричный слой для существующего кода,
 * который пока ожидает функциональный способ подключения контроллера.
 */
export function attachCombatAttackInputController(runtime, options = {}) {
  const controller = new AttackInputController(runtime, options);
  controller.attach();

  return () => {
    controller.dispose();
  };
}