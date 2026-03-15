// @ts-nocheck
/**
 * Поддерживаемые режимы действий игрока в пошаговом бою.
 * Режим определяет, как интерпретировать ввод пользователя:
 * ожидать бездействия, выбирать клетку для перемещения или цель для атаки.
 */
export const PLAYER_ACTION_MODES = Object.freeze({
  IDLE: 'idle',
  MOVE: 'move',
  ATTACK: 'attack'
});

/**
 * Управляет текущим режимом действий игрока в бою.
 * Класс инкапсулирует выбранный режим и даёт единый API для чтения,
 * смены и сброса состояния, чтобы combat runtime, input-контроллеры и HUD
 * работали с одним источником правды.
 */
export class PlayerActionModeStateMachine {
  #mode;

  constructor(options = {}) {
    this.#mode = PlayerActionModeStateMachine.isKnownMode(options.initialMode)
        ? options.initialMode
        : PLAYER_ACTION_MODES.IDLE;
  }

  /**
   * Проверяет, входит ли переданный режим в поддерживаемый набор боевых режимов.
   * Используется для валидации внешнего ввода перед изменением состояния.
   */
  static isKnownMode(mode) {
    return Object.values(PLAYER_ACTION_MODES).includes(mode);
  }

  /**
   * Возвращает текущий режим действий игрока.
   * Это значение используют системы ввода и HUD, чтобы понять,
   * ожидает ли бой перемещение, атаку или находится в нейтральном состоянии.
   */
  getMode() {
    return this.#mode;
  }

  /**
   * Пытается переключить машину состояний в новый режим.
   * Если режим неизвестен, состояние не меняется и вызывающая сторона
   * получает структурированный отказ с причиной ошибки.
   */
  setMode(nextMode) {
    if (!PlayerActionModeStateMachine.isKnownMode(nextMode)) {
      return {
        success: false,
        reason: 'invalid_mode',
        mode: this.#mode
      };
    }

    this.#mode = nextMode;

    return {
      success: true,
      mode: this.#mode
    };
  }

  /**
   * Сбрасывает режим в нейтральное состояние idle.
   * Обычно используется при завершении хода, выходе из режима атаки
   * или любом состоянии, где игрок больше не должен выбирать действие.
   */
  reset() {
    this.#mode = PLAYER_ACTION_MODES.IDLE;
    return this.#mode;
  }
}

/**
 * Оставляет совместимый фабричный способ создания state machine
 * для частей проекта, которые пока ожидают функциональный API.
 */
export function createPlayerActionModeStateMachine(options = {}) {
  return new PlayerActionModeStateMachine(options);
}