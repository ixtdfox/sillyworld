import test from 'node:test';
import assert from 'node:assert/strict';
import { createStandalonePersistence, PERSISTENCE_KEYS } from '../src/platform/browser/localPersistence.ts';

function createStorageStub(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    }
  };
}

test('createStandalonePersistence reports save presence using configured key', () => {
  const storage = createStorageStub();
  const persistence = createStandalonePersistence({ storage });

  assert.equal(persistence.hasSaveData(), false);
  storage.setItem(PERSISTENCE_KEYS.worldSave, '{"ok":true}');
  assert.equal(persistence.hasSaveData(), true);
});

test('createStandalonePersistence respects custom key mapping', () => {
  const storage = createStorageStub({ 'custom.save': 'payload' });
  const persistence = createStandalonePersistence({
    storage,
    keys: { worldSave: 'custom.save' }
  });

  assert.equal(persistence.hasSaveData(), true);
});

test('createStandalonePersistence falls back to in-memory storage when localStorage is missing', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      configurable: true
    });
    const persistence = createStandalonePersistence();
    persistence.storage.setItem('probe', '1');
    assert.equal(persistence.storage.getItem('probe'), '1');
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'localStorage', descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});
