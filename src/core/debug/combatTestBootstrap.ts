import type { SceneRuntimeMountOptions } from '../../render/shared/runtimeContracts.ts';

/** Определяет контракт `CombatTestBootstrapConfig` для согласованного взаимодействия модулей в контексте `core/debug/combatTestBootstrap`. */
export interface CombatTestBootstrapConfig {
  districtId: string;
  sceneOptions: Pick<
    SceneRuntimeMountOptions,
    'playerSpawn' | 'enemySpawn' | 'playerFacingDirection' | 'enemyFacingDirection' | 'skipEnemyPatrol'
  >;
}

// Temporary debug/test bootstrap for launching the real world scene directly into combat.
export const COMBAT_TEST_BOOTSTRAP: CombatTestBootstrapConfig = Object.freeze({
  districtId: 'district:old-city',
  sceneOptions: {
    playerSpawn: Object.freeze({ x: -1, z: 0 }),
    enemySpawn: Object.freeze({ x: 1, z: 0 }),
    playerFacingDirection: Object.freeze({ x: 1, y: 0, z: 0 }),
    enemyFacingDirection: Object.freeze({ x: -1, y: 0, z: 0 }),
    skipEnemyPatrol: true
  }
});

