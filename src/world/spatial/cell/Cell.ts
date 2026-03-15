// @ts-nocheck
/**
 * Value-object боевой клетки нужен, чтобы перестать передавать по коду «сырые» `{x,z}` и
 * централизовать инвариант: координаты тактической сетки всегда целочисленные.
 *
 * Класс не хранит ссылок на сцену/юнитов и поэтому остаётся чистым доменным представлением
 * позиции на поле. Через него проходит нормализация, сравнение и генерация ключа,
 * что упрощает синхронизацию между grid, input и runtime.
 */
export class Cell {
  constructor(x, z) {
    this.x = Math.trunc(x);
    this.z = Math.trunc(z);
    Object.freeze(this);
  }

  /** Возвращает стабильный строковый ключ для Set/Map-индексации состояний по клетке. */
  toKey() {
    return `${this.x},${this.z}`;
  }

  /**
   * Возвращает четырёх ортогональных соседей, которые используются в pathfinding
   * и поиске доступного радиуса перемещения.
   */
  getNeighbors() {
    return [
      new Cell(this.x + 1, this.z),
      new Cell(this.x - 1, this.z),
      new Cell(this.x, this.z + 1),
      new Cell(this.x, this.z - 1)
    ];
  }

  /** Manhattan-дистанция нужна для тактических эвристик ИИ и проверки дальности атак. */
  manhattanDistanceTo(other) {
    const normalizedOther = Cell.from(other);
    return Math.abs(this.x - normalizedOther.x) + Math.abs(this.z - normalizedOther.z);
  }

  /** Сравнение по координатам выражает равенство позиции в тактическом пространстве. */
  equals(other) {
    const normalizedOther = Cell.from(other);
    return this.x === normalizedOther.x && this.z === normalizedOther.z;
  }

  /** Преобразование обратно в plain-object для обратной совместимости со старым API. */
  toPlain() {
    return { x: this.x, z: this.z };
  }

  /**
   * Унифицированная точка входа, которая принимает и `Cell`, и объект `{x,z}`.
   * Если данные невалидны, используется fallback, чтобы runtime не падал в mid-combat.
   */
  static from(cell, fallback = { x: 0, z: 0 }) {
    if (cell instanceof Cell) {
      return cell;
    }

    if (cell && Number.isFinite(cell.x) && Number.isFinite(cell.z)) {
      return new Cell(cell.x, cell.z);
    }

    return new Cell(fallback.x, fallback.z);
  }

  static keyOf(cell, fallback = { x: 0, z: 0 }) {
    return Cell.from(cell, fallback).toKey();
  }
}
