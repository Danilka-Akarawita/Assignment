import { METADATA_MODEL, openai } from '../lib/openai.js';
import {
  buildChunkMetadataUserPrompt,
  buildDocumentSummaryUserPrompt,
  CHUNK_METADATA_SYSTEM_PROMPT,
  DOCUMENT_SUMMARY_SYSTEM_PROMPT,
} from '../prompts/index.js';
import type { ChunkMetadata } from '../types/chunk-metadata.js';
import { isChunkMetadata } from '../types/chunk-metadata.js';
import { logger } from '../utils/logger.js';

const METADATA_BATCH_SIZE = parseInt(process.env.METADATA_BATCH_SIZE ?? '5', 10);

export class MetadataService {
  async generateForChunks(
    chunks: Array<{ index: number; text: string }>,
    documentFilename: string
  ): Promise<Map<number, ChunkMetadata>> {
    const results = new Map<number, ChunkMetadata>();

    for (let i = 0; i < chunks.length; i += METADATA_BATCH_SIZE) {
      const batch = chunks.slice(i, i + METADATA_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((chunk) => this.generateChunkMetadata(chunk.text, documentFilename, chunk.index))
      );

      for (const { index, metadata } of batchResults) {
        results.set(index, metadata);
      }
    }

    logger.debug(
      { chunkCount: chunks.length, filename: documentFilename },
      'Chunk metadata generated'
    );

    return results;
  }

  async generateDocumentSummary(
    text: string,
    filename: string
  ): Promise<{ title: string; summary: string; tags: string[] }> {
    const preview = text.slice(0, 4000);

    const response = await openai.chat.completions.create({
      model: METADATA_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: DOCUMENT_SUMMARY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: buildDocumentSummaryUserPrompt(filename, preview),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty metadata response from LLM');

    const parsed = JSON.parse(raw) as {
      title?: string;
      summary?: string;
      tags?: string[];
    };

    return {
      title: parsed.title ?? filename,
      summary: parsed.summary ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  }

  private async generateChunkMetadata(
    chunkText: string,
    filename: string,
    index: number
  ): Promise<{ index: number; metadata: ChunkMetadata }> {
    const response = await openai.chat.completions.create({
      model: METADATA_MODEL,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: CHUNK_METADATA_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: buildChunkMetadataUserPrompt(filename, index, chunkText),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error(`Empty chunk metadata for index ${index}`);

    const parsed = JSON.parse(raw) as unknown;
    if (!isChunkMetadata(parsed)) {
      throw new Error(`Invalid chunk metadata shape for index ${index}`);
    }

    return { index, metadata: parsed };
  }
}
