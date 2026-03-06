export function indexBy(items = [], key) {
  const out = {};
  for (const item of items) {
    if (item && item[key] != null) out[item[key]] = item;
  }
  return out;
}

export function deepClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
