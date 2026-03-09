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

    const rejectClick = (reason, pickedMeshName) => {
      movementTargetState.clearTarget();
      console.log('[SillyRPG] Scene click rejected:', {
        reason,
        pickedMeshName: pickedMeshName ?? 'none',
        accepted: false
      });
    };

    const pickResult = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    const pickedMeshName = pickResult?.pickedMesh?.name ?? 'none';
    console.log('[SillyRPG] Picked mesh name:', pickedMeshName);

    if (!pickResult?.hit || !pickResult.pickedPoint) {
      rejectClick('no hit', pickedMeshName);
      return;
    }

    if (pickedMeshName === 'Wall') {
      rejectClick('Wall', pickedMeshName);
      return;
    }

    if (!isGroundNode(pickResult.pickedMesh)) {
      rejectClick('not Ground', pickedMeshName);
      return;
    }

    const target = pickResult.pickedPoint.clone();
    movementTargetState.setTarget(target);

    console.log('[SillyRPG] Scene click accepted:', {
      accepted: true,
      pickedMeshName,
      x: target.x,
      y: target.y,
      z: target.z
    });
  });

  return () => {
    runtime.scene.onPointerObservable.remove(pointerObserver);
  };
}
