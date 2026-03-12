export function createBrowserPersistence({ saveKey }) {
  const storage = globalThis.localStorage;

  return {
    storage,
    hasSaveData() {
      try {
        return Boolean(storage?.getItem(saveKey));
      } catch {
        return false;
      }
    }
  };
}
