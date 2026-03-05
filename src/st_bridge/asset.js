export function resolveAsset(relPath) {
  const base = window.__SILLYRPG__?.EXT_BASE || window.location.href;
  return new URL(relPath, base).toString();
}
