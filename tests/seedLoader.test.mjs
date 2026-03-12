import test from 'node:test';
import assert from 'node:assert/strict';

import { BrowserSeedLoader } from '../src/platform/browser/seedLoader.ts';

test('BrowserSeedLoader rejects empty default seed path invariant', () => {
  assert.throws(
    () => new BrowserSeedLoader({ defaultSeedPath: ' ' }),
    /defaultSeedPath must be a non-empty string/
  );
});
