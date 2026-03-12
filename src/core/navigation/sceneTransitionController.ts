import type {
  EnterSceneHandler,
  RegionId,
  SceneTransitionController,
  SceneTransitionControllerDeps,
  SceneTransitionPayload
} from '../../shared/types.js';

function createEnterScenePayload(regionId: RegionId): SceneTransitionPayload {
  return { regionId };
}

export function createSceneTransitionController({ onEnterScene }: SceneTransitionControllerDeps): SceneTransitionController {
  const handleEnterScene: EnterSceneHandler = (payload) => {
    onEnterScene(payload);
  };

  return {
    onMapPinClick(regionId: RegionId): void {
      console.log(`scene transition start from pin: ${regionId}`);
      handleEnterScene(createEnterScenePayload(regionId));
    }
  };
}
