import { config } from 'dotenv';
import OpenAI from 'openai';

config();

const k = (process.env.OPENAI_API_KEY ?? '').trim().replace(/^["']|["']$/g, '');
console.log('key_length', k.length, 'prefix', k.slice(0, 7));

const client = new OpenAI({ apiKey: k });
try {
  const r = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'test',
    dimensions: 1536,
  });
  console.log('OK', r.data[0]?.embedding.length);
} catch (e: unknown) {
  const err = e as { status?: number; code?: string; message?: string };
  console.log('ERR', err.status, err.code, err.message?.slice(0, 100));
}
