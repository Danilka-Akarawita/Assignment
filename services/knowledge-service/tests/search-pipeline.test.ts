import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasSearchFilters,
  restrictFiltersToCatalog,
} from '../src/services/metadata-query.service.js';

describe('search metadata extraction', () => {
  const catalog = {
    topics: ['invoice', 'policy'],
    keywords: ['refund', 'shipping'],
    entities: ['Acme Corp'],
    contentTypes: ['paragraph', 'table'],
    sections: ['Returns', 'Shipping policy'],
  };

  it('keeps only values present in the catalog', () => {
    const filters = restrictFiltersToCatalog(
      {
        topics: ['invoice', 'made-up'],
        keywords: ['REFUND'],
        entities: ['acme corp'],
        contentType: 'table',
        section: 'returns',
      },
      catalog,
    );
    assert.deepEqual(filters.topics, ['invoice']);
    assert.deepEqual(filters.keywords, ['refund']);
    assert.deepEqual(filters.entities, ['Acme Corp']);
    assert.equal(filters.contentType, 'table');
    assert.equal(filters.section, 'Returns');
  });

  it('returns empty filters when nothing matches catalog', () => {
    const filters = restrictFiltersToCatalog(
      { topics: ['unknown'], keywords: ['nope'] },
      catalog,
    );
    assert.deepEqual(filters, {});
    assert.equal(hasSearchFilters(filters), false);
  });
});
