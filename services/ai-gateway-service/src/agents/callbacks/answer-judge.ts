import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from '../config.js';
import { recordAgentStepOutput, traceGeneration } from '../../lib/langfuse.js';
import { logger } from '../../utils/logger.js';

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

export async function judgeFinalAnswer(params: {
  userQuery: string;
  answer: string;
  executionSummary?: string;
  agentRunId?: number;
}): Promise<AnswerJudgeResult> {
  if (!judgeEnabled()) {
    return { passed: true, score: 1, verdict: 'unknown', reason: 'Judge disabled' };
  }

  const trimmedAnswer = params.answer.trim();
  if (!trimmedAnswer) {
    return { passed: false, score: 0, verdict: 'wrong', reason: 'Empty assistant answer' };
  }

  const client = getGenAI();
  if (!client) {
    logger.warn('Answer judge skipped: no GEMINI_API_KEY');
    return { passed: true, score: 1, verdict: 'unknown', reason: 'No API key for judge' };
  }

  const model = process.env.GUARDRAIL_JUDGE_MODEL ?? GEMINI_MODEL;
  const prompt = `You are a quality judge for a customer-support AI assistant.

User question:
${params.userQuery}

Tool / retrieval context (may be empty):
${params.executionSummary?.slice(0, 4000) ?? 'No execution context provided.'}

Assistant answer to evaluate:
${trimmedAnswer.slice(0, 8000)}

Score whether the assistant answer is factually supported by the context, addresses the question, and avoids inventing policy details not present in context.

Return JSON only:
{
  "score": 0.0 to 1.0,
  "verdict": "correct" | "partial" | "wrong",
  "reason": "one short sentence"
}

Rules:
- "correct": fully addresses the question and claims match context (or are general safe guidance when context is empty).
- "partial": mostly helpful but missing key details or slight unsupported claims.
- "wrong": contradicts context, hallucinates policy, or does not answer the question.
`;

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
          config: { responseMimeType: 'application/json' },
        });
        return res.text ?? '';
      }
    );

    const parsed = JSON.parse(raw) as {
      score?: number;
      verdict?: AnswerVerdict;
      reason?: string;
    };

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

    return result;
  } catch (err) {
    logger.warn({ err }, 'Answer judge LLM call failed');
    return {
      passed: true,
      score: 1,
      verdict: 'unknown',
      reason: 'Judge error — fail open',
    };
  }
}

export const GUARDRAIL_FAILURE_USER_MESSAGE =
  "I wasn't able to verify this answer against our knowledge base. Please try again or contact support if you need official policy details.";
