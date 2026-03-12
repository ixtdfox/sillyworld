export function createSceneTransitionController({ onEnterScene }) {
  return {
    onMapPinClick(regionId) {
      console.log(`scene transition start from pin: ${regionId}`);
      onEnterScene({ regionId });
    }
  };
}
