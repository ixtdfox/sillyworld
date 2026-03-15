// @ts-nocheck
/**
 * Доменный модуль мира: хранит и преобразует игровое состояние, правила времени, карты, боя и персонажей. Фокус файла — состояние и поведение игрока в исследовании и связанных действиях.
 */
const ANIMATION_STATE_IDLE = 'Idle';
const ANIMATION_STATE_WALKING = 'Walking';

const IDLE_KEYWORDS = ['idle', 'stand', 'rest', 'breathe'];
const WALKING_KEYWORDS = ['walk', 'run', 'locomotion', 'move'];

/** Выполняет `scoreAnimationGroup` в ходе выполнения связанного игрового сценария. */
function scoreAnimationGroup(name, keywords) {
  const lowerName = (name ?? '').toLowerCase();
  return keywords.reduce((score, keyword) => (lowerName.includes(keyword) ? score + 1 : score), 0);
}

/** Выполняет `pickBestAnimationGroup` в ходе выполнения связанного игрового сценария. */
function pickBestAnimationGroup(animationGroups, keywords) {
  const scoredGroups = animationGroups
    .map((group) => ({ group, score: scoreAnimationGroup(group?.name, keywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredGroups[0]?.group ?? null;
}

/** Определяет `resolveAnimationSet` в ходе выполнения связанного игрового сценария. */
function resolveAnimationSet(animationGroups) {
  const idleGroup = pickBestAnimationGroup(animationGroups, IDLE_KEYWORDS) ?? animationGroups[0] ?? null;
  const walkingGroup = pickBestAnimationGroup(animationGroups, WALKING_KEYWORDS) ?? animationGroups[1] ?? idleGroup;

  return { idleGroup, walkingGroup };
}

/** Выполняет `startAnimationGroup` в ходе выполнения связанного игрового сценария. */
function startAnimationGroup(animationGroups, activeGroup, label) {
  for (const group of animationGroups) {
    if (group !== activeGroup) {
      group.stop();
    }
  }

  activeGroup.start(true);
  console.log(`[SillyRPG] ${label} started`, { animationGroup: activeGroup.name });
}

/** Создаёт и настраивает `createPlayerAnimationController` в ходе выполнения связанного игрового сценария. */
export function createPlayerAnimationController(playerCharacter) {
  const animationGroups = playerCharacter?.animationGroups ?? [];

  const discoveredGroupNames = animationGroups.map((group) => group.name);
  console.log('[SillyRPG] Discovered animation groups:', discoveredGroupNames);

  if (animationGroups.length === 0) {
    console.warn('[SillyRPG] No animation groups found for player character.');
    return {
      setMoving: () => {}
    };
  }

  const { idleGroup, walkingGroup } = resolveAnimationSet(animationGroups);
  console.log('[SillyRPG] Animation group selection:', {
    idle: idleGroup?.name ?? null,
    walking: walkingGroup?.name ?? null
  });

  let currentState = null;

  const setState = (nextState) => {
    if (currentState === nextState) {
      return;
    }

    currentState = nextState;
    console.log('[SillyRPG] Animation state changed:', nextState);

    if (nextState === ANIMATION_STATE_WALKING && walkingGroup) {
      startAnimationGroup(animationGroups, walkingGroup, ANIMATION_STATE_WALKING);
      return;
    }

    if (idleGroup) {
      startAnimationGroup(animationGroups, idleGroup, ANIMATION_STATE_IDLE);
    }
  };

  setState(ANIMATION_STATE_IDLE);

  return {
    /** Обновляет `setMoving` внутри жизненного цикла класса. */
    setMoving(isMoving) {
      setState(isMoving ? ANIMATION_STATE_WALKING : ANIMATION_STATE_IDLE);
    }
  };
}
