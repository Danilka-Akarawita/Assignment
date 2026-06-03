-- CreateTable
CREATE TABLE "tool_executions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tool_name" VARCHAR(64) NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_executions_user_id_idx" ON "tool_executions"("user_id");

-- CreateIndex
CREATE INDEX "tool_executions_tool_name_idx" ON "tool_executions"("tool_name");

-- CreateIndex
CREATE INDEX "tool_executions_created_at_idx" ON "tool_executions"("created_at");
