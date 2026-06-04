import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChunkingService } from '../src/services/chunking.service.js';

describe('ChunkingService (paragraph strategy)', () => {
  const chunking = new ChunkingService();

  it('splits on blank lines into one chunk per paragraph', () => {
    const text = 'First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph.';
    const chunks = chunking.chunk(text);

    assert.equal(chunks.length, 3);
    assert.equal(chunks[0]?.text, 'First paragraph here.');
    assert.equal(chunks[1]?.text, 'Second paragraph here.');
    assert.equal(chunks[2]?.text, 'Third paragraph.');
    assert.deepEqual(
      chunks.map((c) => c.index),
      [0, 1, 2],
    );
  });

  it('falls back to single-newline lines when no blank lines exist', () => {
    const text = 'Line one\nLine two\nLine three';
    const chunks = chunking.chunk(text);

    assert.equal(chunks.length, 3);
    assert.equal(chunks[0]?.text, 'Line one');
    assert.equal(chunks[1]?.text, 'Line two');
  });

  it('keeps a single block when there are no paragraph breaks', () => {
    const text = 'One continuous paragraph without breaks.';
    const chunks = chunking.chunk(text);

    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]?.text, text);
  });

  it('sub-splits oversized paragraphs at sentence boundaries', () => {
    const sentence = 'This is a sentence. ';
    const longParagraph = sentence.repeat(80).trim();
    const chunks = chunking.chunk(longParagraph, 200);

    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.text.length <= 200);
    }
    assert.ok(chunks.every((c) => c.text.endsWith('.') || c.text.length > 0));
  });

  it('returns empty array for whitespace-only input', () => {
    assert.deepEqual(chunking.chunk('   \n\n  '), []);
  });
});
