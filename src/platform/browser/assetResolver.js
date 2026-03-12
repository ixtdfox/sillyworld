export function resolveAssetPath(relPath) {
  return new URL(relPath, window.location.href).toString();
}
