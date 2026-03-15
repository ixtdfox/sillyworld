// @ts-nocheck
const PRIMARY_POINTER_BUTTON = 0;
const SECONDARY_POINTER_BUTTON = 2;

/** Выполняет `ensureRuntimeInputState` в ходе выполнения связанного игрового сценария. */
function ensureRuntimeInputState(runtime) {
  if (!runtime) {
    return null;
  }

  if (!runtime.inputState) {
    runtime.inputState = {
      camera: {
        isOrbiting: false
      }
    };
  }

  if (!runtime.inputState.camera) {
    runtime.inputState.camera = {
      isOrbiting: false
    };
  }

  return runtime.inputState;
}

/** Обновляет `setCameraOrbiting` в ходе выполнения связанного игрового сценария. */
export function setCameraOrbiting(runtime, isOrbiting) {
  const inputState = ensureRuntimeInputState(runtime);
  if (!inputState) {
    return;
  }

  inputState.camera.isOrbiting = isOrbiting === true;
}

/** Выполняет `isCameraOrbiting` в ходе выполнения связанного игрового сценария. */
export function isCameraOrbiting(runtime) {
  return Boolean(runtime?.inputState?.camera?.isOrbiting);
}

/** Выполняет `isPrimaryPointerAction` в ходе выполнения связанного игрового сценария. */
export function isPrimaryPointerAction(pointerInfo) {
  const button = pointerInfo?.event?.button;

  if (button === PRIMARY_POINTER_BUTTON) {
    return true;
  }

  if (typeof button !== 'number') {
    return true;
  }

  return false;
}

/** Выполняет `isSecondaryPointerAction` в ходе выполнения связанного игрового сценария. */
export function isSecondaryPointerAction(pointerInfo) {
  return pointerInfo?.event?.button === SECONDARY_POINTER_BUTTON;
}
