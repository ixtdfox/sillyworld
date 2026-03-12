import type {
  EnterSceneHandler,
  RegionId,
  SceneTransitionController as SceneTransitionControllerContract,
  SceneTransitionControllerDeps,
  SceneTransitionPayload
} from '../../shared/types.js';

function createEnterScenePayload(regionId: RegionId): SceneTransitionPayload {
  return { regionId };
}

export class SceneTransitionController implements SceneTransitionControllerContract {
  readonly #onEnterScene: EnterSceneHandler;

  constructor({ onEnterScene }: SceneTransitionControllerDeps) {
    this.#onEnterScene = onEnterScene;
  }

  onMapPinClick(regionId: RegionId): void {
    console.log(`scene transition start from pin: ${regionId}`);
    this.#onEnterScene(createEnterScenePayload(regionId));
  }
}
