-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'PLANNING', 'EXECUTING', 'COMPLETED', 'FAILED');
CREATE TYPE "TodoStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "gateway_conversations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gateway_agent_runs" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "user_query" TEXT NOT NULL,
    "plan" JSONB,
    "execution_log" JSONB,
    "final_response" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_agent_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gateway_agent_todos" (
    "id" SERIAL NOT NULL,
    "agent_run_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "tool_hint" VARCHAR(64),
    "status" "TodoStatus" NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_agent_todos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "gateway_messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "agent_run_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gateway_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gateway_conversations_user_id_idx" ON "gateway_conversations"("user_id");
CREATE INDEX "gateway_agent_runs_conversation_id_idx" ON "gateway_agent_runs"("conversation_id");
CREATE INDEX "gateway_agent_runs_user_id_idx" ON "gateway_agent_runs"("user_id");
CREATE INDEX "gateway_agent_runs_status_idx" ON "gateway_agent_runs"("status");
CREATE INDEX "gateway_agent_todos_agent_run_id_idx" ON "gateway_agent_todos"("agent_run_id");
CREATE UNIQUE INDEX "gateway_agent_todos_agent_run_id_position_key" ON "gateway_agent_todos"("agent_run_id", "position");
CREATE INDEX "gateway_messages_conversation_id_idx" ON "gateway_messages"("conversation_id");

-- AddForeignKey
ALTER TABLE "gateway_agent_runs" ADD CONSTRAINT "gateway_agent_runs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "gateway_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gateway_agent_todos" ADD CONSTRAINT "gateway_agent_todos_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "gateway_agent_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gateway_messages" ADD CONSTRAINT "gateway_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "gateway_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gateway_messages" ADD CONSTRAINT "gateway_messages_agent_run_id_fkey" FOREIGN KEY ("agent_run_id") REFERENCES "gateway_agent_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
