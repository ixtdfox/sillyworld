export function createSceneTransitionController({ onEnterScene }) {
  return {
    onMapPinClick(regionId) {
      console.log('[SillyRPG] Map pin clicked:', regionId);
      console.log('[SillyRPG] Scene transition start.');
      onEnterScene({ regionId });
    }
  };
}
