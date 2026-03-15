import type {
  EnterSceneHandler,
  RegionId,
  SceneTransitionController as SceneTransitionControllerContract,
  SceneTransitionControllerDeps,
  SceneTransitionPayload
} from '../../shared/types.ts';

/** Создаёт и настраивает `createEnterScenePayload` в ходе выполнения связанного игрового сценария. */
function createEnterScenePayload(regionId: RegionId): SceneTransitionPayload {
  return { regionId };
}

/** Класс `SceneTransitionController` координирует соответствующий сценарий модуля `core/navigation/SceneTransitionController` и инкапсулирует связанную логику. */
export class SceneTransitionController implements SceneTransitionControllerContract {
  readonly #onEnterScene: EnterSceneHandler;

  constructor({ onEnterScene }: SceneTransitionControllerDeps) {
    this.#onEnterScene = onEnterScene;
  }

  /** Обрабатывает `onMapPinClick` внутри жизненного цикла класса. */
  onMapPinClick(regionId: RegionId): void {
    console.log(`scene transition start from pin: ${regionId}`);
    this.#onEnterScene(createEnterScenePayload(regionId));
  }
}
