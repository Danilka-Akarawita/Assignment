import { LlmAgent } from '@google/adk';
import { QUERY_REWRITER_AGENT_INSTRUCTION } from '../prompts/index.js';
import { queryRewriteOutputSchema } from './output-schemas.js';
import { GEMINI_MODEL } from './config.js';

export const queryRewriterAgent = new LlmAgent({
  name: 'QueryRewriterAgent',
  model: GEMINI_MODEL,
  description:
    'Rewrites a user query into an explicit standalone request, using conversation history and summary.',
  instruction: QUERY_REWRITER_AGENT_INSTRUCTION,
  outputSchema: queryRewriteOutputSchema,
  outputKey: 'rewritten_query',
});
