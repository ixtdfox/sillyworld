// @ts-nocheck
function isDescendantOf(node, possibleAncestor) {
  let current = node;
  while (current) {
    if (current === possibleAncestor) {
      return true;
    }
    current = current.parent ?? null;
  }

  return false;
}

function resolveTargetMeshList(targetRoot) {
  if (!targetRoot) {
    return [];
  }

  const childMeshes = typeof targetRoot.getChildMeshes === 'function'
    ? targetRoot.getChildMeshes(false)
    : [];

  return [targetRoot, ...childMeshes].filter((mesh, index, array) => mesh && array.indexOf(mesh) === index);
}

function applySelectionHighlight(targetRoot, selected) {
  const meshes = resolveTargetMeshList(targetRoot);
  meshes.forEach((mesh) => {
    mesh.renderOutline = selected;
    mesh.outlineWidth = selected ? 0.08 : 0;
  });
}

function resolveEntryFromPick(entries, pickedMesh) {
  if (!pickedMesh) {
    return null;
  }

  return entries.find((entry) => {
    const targetRoot = entry?.targetRoot;
    return pickedMesh === targetRoot || isDescendantOf(pickedMesh, targetRoot);
  }) ?? null;
}

export function attachCombatTargetSelectionFlow(runtime, options = {}) {
  const {
    getTargetEntries = () => [],
    isEnabled = () => true,
    onTargetConfirmed = () => {},
    onSelectionChanged = () => {}
  } = options;

  let selectedTargetId = null;

  const clearSelection = () => {
    const entries = getTargetEntries();
    entries.forEach((entry) => applySelectionHighlight(entry.targetRoot, false));
    selectedTargetId = null;
    onSelectionChanged(null);
  };

  const setSelection = (entry) => {
    const entries = getTargetEntries();
    entries.forEach((targetEntry) => {
      applySelectionHighlight(targetEntry.targetRoot, targetEntry?.unit?.id === entry?.unit?.id);
    });

    const nextTargetId = entry?.unit?.id ?? null;
    if (nextTargetId === selectedTargetId) {
      return;
    }

    selectedTargetId = nextTargetId;
    onSelectionChanged(entry);
  };

  const pointerObserver = runtime.scene.onPointerObservable.add((pointerInfo) => {
    if (!isEnabled()) {
      clearSelection();
      return;
    }

    const pickResult = runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);
    if (!pickResult?.hit || !pickResult.pickedMesh) {
      if (pointerInfo.type === runtime.BABYLON.PointerEventTypes.POINTERMOVE) {
        clearSelection();
      }
      return;
    }

    const candidateEntries = getTargetEntries().filter((entry) => entry?.unit?.isAlive !== false);
    const selectedEntry = resolveEntryFromPick(candidateEntries, pickResult.pickedMesh);

    if (pointerInfo.type === runtime.BABYLON.PointerEventTypes.POINTERMOVE) {
      setSelection(selectedEntry);
      return;
    }

    if (pointerInfo.type === runtime.BABYLON.PointerEventTypes.POINTERDOWN && selectedEntry) {
      setSelection(selectedEntry);
      onTargetConfirmed(selectedEntry, pickResult);
    }
  });

  const beforeRenderObserver = runtime.scene.onBeforeRenderObservable.add(() => {
    if (isEnabled()) {
      return;
    }

    if (selectedTargetId !== null) {
      clearSelection();
    }
  });

  return () => {
    clearSelection();
    runtime.scene.onPointerObservable.remove(pointerObserver);
    runtime.scene.onBeforeRenderObservable.remove(beforeRenderObserver);
  };
}
