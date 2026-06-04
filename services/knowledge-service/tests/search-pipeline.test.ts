import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeSearchFilters,
} from '../src/services/metadata-query.service.js';

describe('search metadata merge', () => {
  it('merges explicit and extracted filters', () => {
    const merged = mergeSearchFilters(
      { topics: ['invoice'] },
      { topics: ['finance'], keywords: ['acme'] },
    );
    assert.deepEqual(merged?.topics?.sort(), ['finance', 'invoice']);
    assert.deepEqual(merged?.keywords, ['acme']);
  });

  it('returns undefined when no filters', () => {
    assert.equal(mergeSearchFilters({}, {}), undefined);
  });
});
