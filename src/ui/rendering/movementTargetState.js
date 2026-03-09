export function createMovementTargetState() {
  let target = null;

  return {
    getTarget: () => target,
    hasTarget: () => Boolean(target),
    setTarget: (nextTarget) => {
      target = nextTarget ? nextTarget.clone() : null;
    },
    clearTarget: () => {
      target = null;
    }
  };
}
