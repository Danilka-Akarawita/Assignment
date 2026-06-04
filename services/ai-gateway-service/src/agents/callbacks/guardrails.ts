import type {
  CallbackContext,
  SingleAfterModelCallback,
  SingleAgentCallback,
  SingleBeforeToolCallback,
} from '@google/adk';
import type { Content } from '@google/genai';
import { logger } from '../../utils/logger.js';
import { recordAgentStepOutput } from '../../lib/langfuse.js';
import {
  buildGuardrailBlockedAnswerText,
  buildGuardrailLowConfidenceAppend,
  GUARDRAIL_EMPTY_INPUT_MESSAGE,
  GUARDRAIL_MESSAGE_TOO_LONG_MESSAGE,
} from '../../prompts/index.js';
import { parseAgentJson, type SynthesisOutput } from '../../types/agent-plan.js';
import { judgeFinalAnswer, shouldBlockFailedAnswers } from './answer-judge.js';

function contentToText(content?: Content): string {
  if (!content?.parts?.length) return '';
  return content.parts
    .map((p) => ('text' in p && typeof p.text === 'string' ? p.text : ''))
    .join('')
    .trim();
}

function getUserQuery(context: CallbackContext): string {
  const fromUser = contentToText(context.userContent);
  if (fromUser) return fromUser;
  const stateQuery = context.state.get<string>('user_query');
  return stateQuery ?? '';
}

/** Reject empty or abusive inputs before any LLM agent runs. */
export const beforeAgentGuard: SingleAgentCallback = async (context: CallbackContext) => {
  const query = getUserQuery(context);
  if (!query.trim()) {
    logger.warn({ agent: context.agentName }, 'Guardrail: empty user input');
    return {
      role: 'model',
      parts: [{ text: GUARDRAIL_EMPTY_INPUT_MESSAGE }],
    };
  }
  if (query.length > 8000) {
    return {
      role: 'model',
      parts: [{ text: GUARDRAIL_MESSAGE_TOO_LONG_MESSAGE }],
    };
  }
  return undefined;
};

/** Validate tool name and arguments before remote execution. */
export const beforeToolGuard: SingleBeforeToolCallback = async ({ tool, args, context }) => {
  const toolName = tool.name ?? 'unknown';

  recordAgentStepOutput(
    'guardrail.before-tool',
    { tool: toolName, args },
    { allowed: true },
    { agent: context.agentName }
  );

  if (toolName === 'sql_query' || toolName === 'sql') {
    const question = typeof args.question === 'string' ? args.question : '';
    if (!question.trim()) {
      return { error: 'A natural language question is required', blocked: true };
    }
    if (question.length > 4000) {
      return { error: 'SQL question is too long', blocked: true };
    }
  }

  if (toolName === 'knowledge_retrieval') {
    const q = typeof args.query === 'string' ? args.query : '';
    if (!q.trim()) {
      return { error: 'Search query is required', blocked: true };
    }
    if (q.length > 2000) {
      return { error: 'Search query too long', blocked: true };
    }
  }

  if (toolName === 'calculator') {
    const expr = typeof args.expression === 'string' ? args.expression : '';
    if (!expr.trim()) {
      return { error: 'Expression is required', blocked: true };
    }
  }

  return undefined;
};

/**
 * After the synthesis model generates text: LLM-as-judge for correct vs wrong.
 * Optionally replaces the response when GUARDRAIL_BLOCK_ON_FAIL=true.
 */
export const synthesisAfterModelJudge: SingleAfterModelCallback = async ({
  context,
  response,
}) => {
  const rawAnswer = contentToText(response.content);
  if (!rawAnswer) return undefined;

  const synthesis = parseAgentJson<SynthesisOutput>(rawAnswer);
  const answer =
    typeof synthesis?.answer === 'string' && synthesis.answer.trim()
      ? synthesis.answer.trim()
      : rawAnswer;

  const userQuery = getUserQuery(context);
  const executionRaw = context.state.get('execution_results');
  const executionSummary =
    typeof executionRaw === 'string'
      ? executionRaw.slice(0, 4000)
      : executionRaw !== undefined && executionRaw !== null
        ? JSON.stringify(executionRaw).slice(0, 4000)
        : undefined;

  const agentRunId = context.state.get<number>('agent_run_id');

  const judge = await judgeFinalAnswer({
    userQuery,
    answer,
    ...(executionSummary ? { executionSummary } : {}),
    ...(typeof agentRunId === 'number' ? { agentRunId } : {}),
  });

  context.state.set('answer_judge', judge);

  if (!judge.passed) {
    logger.info(
      {
        agentRunId,
        passed: judge.passed,
        score: judge.score,
        verdict: judge.verdict,
        reason: judge.reason,
        blockOnFail: shouldBlockFailedAnswers(),
        appendWarning: process.env.GUARDRAIL_APPEND_WARNING === 'true',
      },
      'Guardrail: answer failed judge — applying policy',
    );

    if (shouldBlockFailedAnswers()) {
      return {
        ...response,
        content: {
          role: 'model',
          parts: [
            {
              text: buildGuardrailBlockedAnswerText({
                verdict: judge.verdict,
                score: judge.score,
                reason: judge.reason,
              }),
            },
          ],
        },
      };
    }

    if (process.env.GUARDRAIL_APPEND_WARNING === 'true') {
      return {
        ...response,
        content: {
          role: 'model',
          parts: [
            {
              text: buildGuardrailLowConfidenceAppend({
                answer,
                verdict: judge.verdict,
                score: judge.score,
              }),
            },
          ],
        },
      };
    }
  } else {
    logger.info(
      {
        agentRunId,
        passed: judge.passed,
        score: judge.score,
        verdict: judge.verdict,
        reason: judge.reason,
      },
      'Guardrail: answer passed judge — showing synthesis answer',
    );
  }

  return undefined;
};

/** Log judge result after synthesis agent completes. */
export const synthesisAfterAgentLog: SingleAgentCallback = async (context: CallbackContext) => {
  const judge = context.state.get('answer_judge');
  if (judge) {
    recordAgentStepOutput(
      'guardrail.after-agent',
      { agent: context.agentName },
      judge,
      { agentRunId: context.state.get('agent_run_id') }
    );
  }
  return undefined;
};