// @ts-nocheck
/**
 * Точка входа оставлена стабильной для всей остальной игры.
 * Под капотом orchestration перемещён в класс `CombatEncounter`, чтобы
 * жизненный цикл боя был изолирован в отдельном runtime-пакете.
 */
import { CombatEncounter } from './runtime/CombatEncounter.ts';

export { CombatEncounter };

export async function createCombatRuntime(runtime, options = {}) {
  const encounter = new CombatEncounter(runtime, options);
  return encounter.initialize();
}
