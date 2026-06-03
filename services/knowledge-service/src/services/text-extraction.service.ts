import { logger } from '../utils/logger.js';

export class TextExtractionService {
  async extract(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractPdf(buffer);
      case 'text/plain':
      case 'text/markdown':
        return buffer.toString('utf-8');
      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      const text = result.text.trim();
      if (!text) throw new Error('PDF contains no extractable text');
      logger.debug({ pages: result.total, textLength: text.length }, 'PDF extracted');
      return text;
    } finally {
      await parser.destroy();
    }
  }
}
