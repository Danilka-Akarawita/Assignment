import { logger } from '../utils/logger.js';

export interface TextChunk {
  index: number;
  text: string;
}

/** When a single paragraph exceeds this length, split it at sentence boundaries. */
const DEFAULT_MAX_PARAGRAPH_CHARS = parseInt(
  process.env.CHUNK_MAX_PARAGRAPH_CHARS ?? '4000',
  10,
);

export class ChunkingService {
  /**
   * Split text into one chunk per paragraph (blank-line separated blocks).
   * Oversized paragraphs are sub-split at sentence boundaries — not fixed-size windows.
   */
  chunk(text: string, maxParagraphChars = DEFAULT_MAX_PARAGRAPH_CHARS): TextChunk[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const paragraphs = this.splitParagraphs(normalized);
    const chunks: TextChunk[] = [];
    let index = 0;

    for (const paragraph of paragraphs) {
      const pieces =
        paragraph.length <= maxParagraphChars
          ? [paragraph]
          : this.splitOversizedParagraph(paragraph, maxParagraphChars);

      for (const piece of pieces) {
        const chunkText = piece.trim();
        if (chunkText.length > 0) {
          chunks.push({ index, text: chunkText });
          index++;
        }
      }
    }

    logger.debug(
      {
        chunkCount: chunks.length,
        paragraphCount: paragraphs.length,
        maxParagraphChars,
        textLength: normalized.length,
        strategy: 'paragraph',
      },
      'Text chunked',
    );

    return chunks;
  }

  /** Blank-line blocks; falls back to single-newline lines when no blank lines exist. */
  private splitParagraphs(text: string): string[] {
    const blocks = text
      .split(/\n\s*\n+/)
      .map((block) => block.trim())
      .filter(Boolean);

    if (blocks.length > 1) return blocks;

    const single = blocks[0] ?? text.trim();
    if (!single) return [];

    const lines = single
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 1 ? lines : [single];
  }

  private splitOversizedParagraph(text: string, maxChars: number): string[] {
    const pieces: string[] = [];
    let remaining = text.trim();

    while (remaining.length > maxChars) {
      const slice = remaining.slice(0, maxChars);
      const breakAt = this.findSentenceBreak(slice);
      const cut = breakAt > maxChars * 0.4 ? breakAt : maxChars;
      const piece = remaining.slice(0, cut).trim();
      if (piece) pieces.push(piece);
      remaining = remaining.slice(cut).trim();
    }

    if (remaining) pieces.push(remaining);
    return pieces;
  }

  private findSentenceBreak(slice: string): number {
    const delimiters = ['. ', '? ', '! ', '.\n', '?\n', '!\n', '; ', '\n'];
    for (const delimiter of delimiters) {
      const pos = slice.lastIndexOf(delimiter);
      if (pos !== -1) return pos + delimiter.length;
    }
    const space = slice.lastIndexOf(' ');
    return space !== -1 ? space + 1 : slice.length;
  }
}
