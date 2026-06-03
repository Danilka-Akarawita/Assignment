import { searchKnowledge } from '../lib/knowledge-client.js';
import type { KnowledgeRetrievalInput } from '../schemas/tool.schema.js';
import type { ToolContext } from '../types/tools.js';

export class KnowledgeRetrievalService {
  async retrieve(ctx: ToolContext, input: KnowledgeRetrievalInput) {
    return searchKnowledge(ctx.authToken, input);
  }
}
