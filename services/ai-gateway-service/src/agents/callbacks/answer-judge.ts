import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from '../config.js';
import { answerJudgeOutputSchema } from '../output-schemas.js';
import { buildAnswerJudgePrompt } from '../../prompts/index.js';
import { recordAgentStepOutput, traceGeneration } from '../../lib/langfuse.js';
import { logger } from '../../utils/logger.js';

export { GUARDRAIL_FAILURE_USER_MESSAGE } from '../../prompts/index.js';

export type AnswerVerdict = 'correct' | 'partial' | 'wrong' | 'unknown';

export interface AnswerJudgeResult {
  passed: boolean;
  score: number;
  verdict: AnswerVerdict;
  reason: string;
}

const DEFAULT_MIN_SCORE = 0.6;

function judgeEnabled(): boolean {
  return process.env.GUARDRAIL_JUDGE_ENABLED !== 'false';
}

function blockOnFail(): boolean {
  return process.env.GUARDRAIL_BLOCK_ON_FAIL === 'true';
}

function minScore(): number {
  const raw = process.env.GUARDRAIL_MIN_SCORE;
  if (!raw) return DEFAULT_MIN_SCORE;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : DEFAULT_MIN_SCORE;
}

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export function isAnswerJudgeEnabled(): boolean {
  return judgeEnabled();
}

export function shouldBlockFailedAnswers(): boolean {
  return blockOnFail();
}

function logJudgeOutcome(
  result: AnswerJudgeResult,
  extra: Record<string, unknown> = {},
): void {
  logger.info(
    {
      ...extra,
      judge: {
        score: result.score,
        verdict: result.verdict,
        reason: result.reason,
        passed: result.passed,
        minScore: minScore(),
      },
    },
    'Answer judge result',
  );
}

export async function judgeFinalAnswer(params: {
  userQuery: string;
  answer: string;
  executionSummary?: string;
  agentRunId?: number;
}): Promise<AnswerJudgeResult> {
  const logCtx = {
    agentRunId: params.agentRunId,
    userQueryPreview: params.userQuery.slice(0, 120),
  };

  if (!judgeEnabled()) {
    const result = {
      passed: true,
      score: 1,
      verdict: 'unknown' as const,
      reason: 'Judge disabled',
    };
    logJudgeOutcome(result, { ...logCtx, skipped: true });
    return result;
  }

  const trimmedAnswer = params.answer.trim();
  if (!trimmedAnswer) {
    const result = {
      passed: false,
      score: 0,
      verdict: 'wrong' as const,
      reason: 'Empty assistant answer',
    };
    logJudgeOutcome(result, logCtx);
    return result;
  }

  const client = getGenAI();
  if (!client) {
    logger.warn(logCtx, 'Answer judge skipped: no GEMINI_API_KEY');
    const result = {
      passed: true,
      score: 1,
      verdict: 'unknown' as const,
      reason: 'No API key for judge',
    };
    logJudgeOutcome(result, { ...logCtx, skipped: true });
    return result;
  }

  const model = process.env.GUARDRAIL_JUDGE_MODEL ?? GEMINI_MODEL;
  const prompt = buildAnswerJudgePrompt({
    userQuery: params.userQuery,
    executionSummary:
      params.executionSummary?.slice(0, 4000) ?? 'No execution context provided.',
    answer: trimmedAnswer.slice(0, 8000),
  });

  try {
    const raw = await traceGeneration(
      {
        name: 'guardrail.answer-judge',
        model,
        input: { userQuery: params.userQuery, answerLength: trimmedAnswer.length },
        metadata: { agentRunId: params.agentRunId },
      },
      async () => {
        const res = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: answerJudgeOutputSchema,
          },
        });
        return res.text ?? '';
      }
    );

    const parsed = JSON.parse(raw) as {
      score?: number;
      verdict?: AnswerVerdict;
      reason?: string;
    };

    logger.debug(
      {
        ...logCtx,
        model,
        judgeLlmOutput: parsed,
        rawLength: raw.length,
      },
      'Answer judge LLM raw JSON',
    );

    const score =
      typeof parsed.score === 'number' ? Math.min(1, Math.max(0, parsed.score)) : 0.5;
    const verdict =
      parsed.verdict === 'correct' ||
      parsed.verdict === 'partial' ||
      parsed.verdict === 'wrong'
        ? parsed.verdict
        : 'unknown';
    const reason = typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided';
    const passed = score >= minScore() && verdict !== 'wrong';

    const result: AnswerJudgeResult = { passed, score, verdict, reason };

    recordAgentStepOutput(
      'guardrail.answer-judge.result',
      { userQuery: params.userQuery },
      result,
      { agentRunId: params.agentRunId }
    );

    logJudgeOutcome(result, logCtx);

    return result;
  } catch (err) {
    logger.warn({ err, ...logCtx }, 'Answer judge LLM call failed');
    const result = {
      passed: true,
      score: 1,
      verdict: 'unknown' as const,
      reason: 'Judge error — fail open',
    };
    logJudgeOutcome(result, { ...logCtx, error: true });
    return result;
  }
}
