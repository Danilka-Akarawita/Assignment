import { logger } from '../utils/logger.js';

export interface TextChunk {
  index: number;
  text: string;
}

const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE ?? '1000', 10);
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP ?? '200', 10);

export class ChunkingService {
  chunk(text: string, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP): TextChunk[] {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const chunks: TextChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < normalized.length) {
      let end = Math.min(start + chunkSize, normalized.length);

      if (end < normalized.length) {
        const slice = normalized.slice(start, end);
        const breakAt = this.findBreakPoint(slice);
        if (breakAt > chunkSize * 0.5) {
          end = start + breakAt;
        }
      }

      const chunkText = normalized.slice(start, end).trim();
      if (chunkText.length > 0) {
        chunks.push({ index, text: chunkText });
        index++;
      }

      if (end >= normalized.length) break;
      start = Math.max(end - overlap, start + 1);
    }

    logger.debug(
      { chunkCount: chunks.length, chunkSize, overlap, textLength: normalized.length },
      'Text chunked'
    );

    return chunks;
  }

  private findBreakPoint(slice: string): number {
    const priorities = ['\n\n', '\n', '. ', '? ', '! ', '; ', ', ', ' '];
    for (const delimiter of priorities) {
      const pos = slice.lastIndexOf(delimiter);
      if (pos !== -1) {
        return pos + delimiter.length;
      }
    }
    return slice.length;
  }
}
