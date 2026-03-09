const GROUND_MESH_NAME = 'Ground';

function isGroundNode(node) {
  let current = node;
  while (current) {
    if (current.name === GROUND_MESH_NAME) {
      return true;
    }
    current = current.parent ?? null;
  }

  return false;
}

export function attachGroundClickInput(runtime, movementTargetState) {
  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== runtime.BABYLON.PointerEventTypes.POINTERDOWN) {
      return;
    }

    console.log('[SillyRPG] Scene click');

    const pickResult = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    console.log('[SillyRPG] Picked mesh name:', pickResult?.pickedMesh?.name ?? 'none');

    if (!pickResult?.hit || !pickResult.pickedPoint) {
      return;
    }

    if (!isGroundNode(pickResult.pickedMesh)) {
      return;
    }

    const target = pickResult.pickedPoint.clone();
    movementTargetState.setTarget(target);

    console.log('[SillyRPG] Accepted ground target position:', {
      x: target.x,
      y: target.y,
      z: target.z
    });
  });

  return () => {
    runtime.scene.onPointerObservable.remove(pointerObserver);
  };
}
