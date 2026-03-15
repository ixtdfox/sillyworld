// @ts-nocheck
import { Cell } from '../../spatial/cell/Cell.ts';

const DEFAULT_AP_PER_TURN = 2;
const DEFAULT_MP_PER_TURN = 6;
const DEFAULT_HP = 20;
const DEFAULT_BASIC_ATTACK_DAMAGE = 4;
const DEFAULT_FALLBACK_ATTACK_RANGE = 1;

/**
 * `CombatUnit` — агрегат состояния боевого участника.
 *
 * Класс нужен, чтобы владение AP/MP/HP, позицией в сетке и ссылками на визуальную сущность
 * находилось в одном месте, а не в разрозненных plain-объектах runtime.
 */
export class CombatUnit {
  constructor({ id, team, entity, initiative = 0, displayName = id }) {
    const attackRange = entity?.gameplayDimensions?.attackRange;

    this.id = id;
    this.displayName = displayName;
    this.team = team;
    this.initiative = initiative;
    this.maxAp = DEFAULT_AP_PER_TURN;
    this.maxMp = DEFAULT_MP_PER_TURN;
    this.maxHp = DEFAULT_HP;
    this.hp = DEFAULT_HP;
    this.isAlive = true;
    this.attackRange = Number.isFinite(attackRange) ? attackRange : DEFAULT_FALLBACK_ATTACK_RANGE;
    this.attackPower = DEFAULT_BASIC_ATTACK_DAMAGE;
    this.ap = DEFAULT_AP_PER_TURN;
    this.mp = DEFAULT_MP_PER_TURN;
    this.gridCell = null;
    this.gameplayDimensions = entity?.gameplayDimensions;
    this.rootNode = entity?.rootNode;
    this.meshes = entity?.meshes;
    this.skeletons = entity?.skeletons;
    this.animationGroups = entity?.animationGroups;
    this.entity = entity;
  }

  /**
   * Сохраняем позицию юнита только как `Cell`, потому что это единый формат для grid occupancy,
   * дальности атаки и pathfinding. Legacy-входы `{x,z}` разрешены лишь как совместимость на границе.
   */
  setGridCell(cell) {
    const normalizedCell = Cell.from(cell);
    this.gridCell = normalizedCell;
    if (this.rootNode) {
      this.rootNode.gridCell = normalizedCell;
    }
    if (this.entity) {
      this.entity.gridCell = normalizedCell;
    }
  }

  /** В начале каждого хода возвращает ресурсную модель юнита в стартовое состояние раунда. */
  resetTurnResources() {
    if (!this.isAlive) {
      return;
    }

    this.ap = this.maxAp;
    this.mp = this.maxMp;
  }
}

export function createCombatUnit(id, team, entity, initiative = 0, displayName = id) {
  return new CombatUnit({ id, team, entity, initiative, displayName });
}
