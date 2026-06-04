/**
 * Seeds demo rows for UI testing (SQL tool + knowledge tables).
 *
 * Usage:
 *   cd scripts && npm install && npm run seed
 *
 * Env (optional):
 *   DATABASE_URL — default postgresql://app_user:app_pass@localhost:5432/app_db
 *   SEED_DEMO_EMAIL — default demo@example.com
 *   SEED_DEMO_PASSWORD — default Demo123!
 */
import { config } from 'dotenv';
import bcrypt from 'bcrypt';
import pg from 'pg';

config({ path: '../services/auth-service/.env' });
config({ path: '../.env' });

const DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://app_user:app_pass@localhost:5432/app_db';
const DEMO_EMAIL = process.env.SEED_DEMO_EMAIL ?? 'demo@example.com';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'Demo123!';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);

const DEMO_FILE_PREFIX = '[demo] ';

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const userId = await ensureDemoUser(client);
    const docs = await seedKnowledgeDocuments(client, userId);
    await seedGatewayHistory(client, userId);

    console.log('\nDemo data ready.\n');
    console.log(`  Login:  ${DEMO_EMAIL}`);
    console.log(`  Password: ${DEMO_PASSWORD}`);
    console.log(`  user_id: ${userId}`);
    console.log(`  Knowledge documents seeded: ${docs}`);
    console.log('\nExample chat prompts (should use sql_query):\n');
    console.log('  - How many completed documents do I have?');
    console.log('  - List my demo document filenames and their status');
    console.log('  - How many gateway conversations do I have?');
    console.log('\nEnsure OPENAI_API_KEY is set in tool-execution-service .env\n');
  } finally {
    await client.end();
  }
}

async function ensureDemoUser(client: pg.Client): Promise<number> {
  const existing = await client.query<{ id: number }>(
    'SELECT id FROM auth_users WHERE email = $1',
    [DEMO_EMAIL],
  );

  if (existing.rows[0]) {
    console.log(`Using existing user id=${existing.rows[0].id} (${DEMO_EMAIL})`);
    return existing.rows[0].id;
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
  const inserted = await client.query<{ id: number }>(
    `INSERT INTO auth_users (email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, 'user', NOW(), NOW())
     RETURNING id`,
    [DEMO_EMAIL, hash],
  );
  const id = inserted.rows[0]!.id;
  console.log(`Created user id=${id} (${DEMO_EMAIL})`);
  return id;
}

async function seedKnowledgeDocuments(
  client: pg.Client,
  userId: number,
): Promise<number> {
  const existing = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM knowledge_documents
     WHERE user_id = $1 AND filename LIKE $2`,
    [userId, `${DEMO_FILE_PREFIX}%`],
  );
  if (parseInt(existing.rows[0]?.count ?? '0', 10) > 0) {
    console.log('Demo knowledge documents already present — skipping');
    return parseInt(existing.rows[0]!.count, 10);
  }

  const documents = [
    {
      filename: `${DEMO_FILE_PREFIX}hr-policy.pdf`,
      title: 'HR Policy Handbook',
      summary: 'Annual leave and remote work guidelines.',
      status: 'COMPLETED',
      tags: ['policy', 'hr'],
    },
    {
      filename: `${DEMO_FILE_PREFIX}invoice-acme.pdf`,
      title: 'Acme Invoice Q1',
      summary: 'Invoice total 4200 USD, due April 30.',
      status: 'COMPLETED',
      tags: ['invoice', 'finance'],
    },
    {
      filename: `${DEMO_FILE_PREFIX}draft-notes.txt`,
      title: 'Draft Notes',
      summary: 'Work in progress — not finalized.',
      status: 'PENDING',
      tags: ['draft'],
    },
  ];

  let count = 0;
  for (const doc of documents) {
    const inserted = await client.query<{ id: number }>(
      `INSERT INTO knowledge_documents (
         user_id, filename, title, summary, tags, status, chunk_count, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6::"DocumentStatus", 1, NOW(), NOW())
       RETURNING id`,
      [userId, doc.filename, doc.title, doc.summary, doc.tags, doc.status],
    );
    const documentId = inserted.rows[0]!.id;
    await client.query(
      `INSERT INTO knowledge_document_chunks (
         document_id, chunk_index, chunk_text, created_at
       ) VALUES ($1, 0, $2, NOW())`,
      [
        documentId,
        `Demo chunk for ${doc.title}. ${doc.summary}`,
      ],
    );
    count++;
  }

  return count;
}

async function seedGatewayHistory(
  client: pg.Client,
  userId: number,
): Promise<void> {
  const existing = await client.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM gateway_conversations
     WHERE user_id = $1 AND title LIKE '[demo]%'`,
    [userId],
  );
  if (parseInt(existing.rows[0]?.count ?? '0', 10) > 0) {
    console.log('Demo gateway conversations already present — skipping');
    return;
  }

  for (const title of ['[demo] Benefits question', '[demo] Invoice lookup']) {
    const conv = await client.query<{ id: number }>(
      `INSERT INTO gateway_conversations (user_id, title, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id`,
      [userId, title],
    );
    const conversationId = conv.rows[0]!.id;
    await client.query(
      `INSERT INTO gateway_messages (conversation_id, role, content, created_at)
       VALUES ($1, 'USER', $2, NOW())`,
      [conversationId, `Seeded message for ${title}`],
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
