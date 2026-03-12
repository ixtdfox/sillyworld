export function indexBy<T extends Record<string, unknown>, K extends keyof T & string>(items: T[] = [], key: K): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of items) {
    const indexValue = item?.[key];
    if (typeof indexValue === 'string' || typeof indexValue === 'number') {
      out[String(indexValue)] = item;
    }
  }
  return out;
}

export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
