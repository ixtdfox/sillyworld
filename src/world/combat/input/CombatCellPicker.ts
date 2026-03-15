import { Cell } from '../../spatial/cell/Cell.ts';

/**
 * Компонент выбора тактической клетки инкапсулирует input-правила:
 * как извлечь клетку из pickResult, как игнорировать HUD и как перейти
 * к fallback-резолву через world->grid mapper.
 */
export class CombatCellPicker {
  static MOVE_HIGHLIGHT_MESH_PREFIX = 'combatMoveHighlight_';

  /**
   * Разбор имени highlight-меша нужен как резервный канал, когда в metadata
   * нет координат, но рендерер заранее закодировал их в name.
   */
  tryParseCellFromHighlightMeshName(meshName: unknown) {
    if (typeof meshName !== 'string' || !meshName.startsWith(CombatCellPicker.MOVE_HIGHLIGHT_MESH_PREFIX)) {
      return null;
    }

    const [x, z] = meshName
      .slice(CombatCellPicker.MOVE_HIGHLIGHT_MESH_PREFIX.length)
      .split('_')
      .map((value) => Number.parseInt(value, 10));

    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      return null;
    }

    return new Cell(x, z);
  }

  isCombatGuiPick(pickResult: any) {
    return Boolean(pickResult?.pickedMesh?.metadata?.isCombatHudControl);
  }

  tryResolveCellFromPickResult(pickResult: any, gridMapper: any) {
    if (!pickResult?.hit || !pickResult.pickedPoint) {
      return null;
    }

    const mesh = pickResult.pickedMesh ?? null;
    const metadataCell = mesh?.metadata?.combatGridCell ?? mesh?.metadata?.gridCell ?? null;
    if (metadataCell && Number.isFinite(metadataCell.x) && Number.isFinite(metadataCell.z)) {
      return Cell.from(metadataCell);
    }

    const meshNamedCell = this.tryParseCellFromHighlightMeshName(mesh?.name);
    if (meshNamedCell) {
      return meshNamedCell;
    }

    return Cell.from(gridMapper.worldToGridCell(pickResult.pickedPoint));
  }

  pickCombatCellAtPointer(runtime: any, gridMapper: any, pointerPickInfo: any = null) {
    const pickResult = pointerPickInfo?.hit
      ? pointerPickInfo
      : runtime.scene.pick(runtime.scene.pointerX, runtime.scene.pointerY);

    if (!pickResult?.hit || !pickResult.pickedPoint || this.isCombatGuiPick(pickResult)) {
      return { pickResult, cell: null };
    }

    return {
      pickResult,
      cell: this.tryResolveCellFromPickResult(pickResult, gridMapper)
    };
  }
}
