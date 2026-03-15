/**
 * Модуль слоя core: связывает сценарии запуска, навигацию и инфраструктурные зависимости приложения. Фокус файла — навигация по карте и переходы между контекстами локаций.
 */
import type {
  EnterSceneHandler,
  RegionId,
  SceneTransitionController as SceneTransitionControllerContract,
  SceneTransitionControllerDeps,
  SceneTransitionPayload
} from '../../shared/types.ts';

/** Упаковывает идентификатор выбранного региона в payload перехода в сцену. */
function createEnterScenePayload(regionId: RegionId): SceneTransitionPayload {
  return { regionId };
}

/**
 * Адаптер между кликом по карте и запуском 3D-сцены.
 * Нужен, чтобы UI не зависел от деталей того, как именно приложение инициирует вход в сцену.
 */
export class SceneTransitionController implements SceneTransitionControllerContract {
  readonly #onEnterScene: EnterSceneHandler;

  constructor({ onEnterScene }: SceneTransitionControllerDeps) {
    this.#onEnterScene = onEnterScene;
  }

  /**
   * Реагирует на выбор пина на карте: фиксирует событие в лог и делегирует запуск сцены
   * в обработчик, переданный из AppController.
   */
  onMapPinClick(regionId: RegionId): void {
    console.log(`scene transition start from pin: ${regionId}`);
    this.#onEnterScene(createEnterScenePayload(regionId));
  }
}
