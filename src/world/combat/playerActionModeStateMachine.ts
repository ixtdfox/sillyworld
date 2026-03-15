// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — пошаговый бой: клетки, действия, очередь ходов или управление вводом в бою.
 */
const PLAYER_ACTION_MODES = Object.freeze({
  IDLE: 'idle',
  MOVE: 'move',
  ATTACK: 'attack'
});

/** Выполняет `isKnownMode` в ходе выполнения связанного игрового сценария. */
function isKnownMode(mode) {
  return Object.values(PLAYER_ACTION_MODES).includes(mode);
}

/** Создаёт и настраивает `createPlayerActionModeStateMachine` в ходе выполнения связанного игрового сценария. */
export function createPlayerActionModeStateMachine(options = {}) {
  const initialMode = isKnownMode(options.initialMode) ? options.initialMode : PLAYER_ACTION_MODES.IDLE;
  let mode = initialMode;

  const getMode = () => mode;

  const setMode = (nextMode) => {
    if (!isKnownMode(nextMode)) {
      return {
        success: false,
        reason: 'invalid_mode',
        mode
      };
    }

    mode = nextMode;
    return {
      success: true,
      mode
    };
  };

  const reset = () => {
    mode = PLAYER_ACTION_MODES.IDLE;
    return mode;
  };

  return {
    getMode,
    setMode,
    reset
  };
}

export { PLAYER_ACTION_MODES };
