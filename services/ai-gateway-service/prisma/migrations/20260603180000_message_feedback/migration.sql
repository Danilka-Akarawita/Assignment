-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "gateway_message_feedback" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "user_message_id" INTEGER NOT NULL,
    "assistant_message_id" INTEGER NOT NULL,
    "user_query" TEXT NOT NULL,
    "assistant_answer" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_message_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gateway_message_feedback_conversation_id_idx" ON "gateway_message_feedback"("conversation_id");

-- CreateIndex
CREATE INDEX "gateway_message_feedback_user_id_idx" ON "gateway_message_feedback"("user_id");

-- CreateIndex
CREATE INDEX "gateway_message_feedback_created_at_idx" ON "gateway_message_feedback"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_message_feedback_user_id_assistant_message_id_key" ON "gateway_message_feedback"("user_id", "assistant_message_id");

-- AddForeignKey
ALTER TABLE "gateway_message_feedback" ADD CONSTRAINT "gateway_message_feedback_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "gateway_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_message_feedback" ADD CONSTRAINT "gateway_message_feedback_user_message_id_fkey" FOREIGN KEY ("user_message_id") REFERENCES "gateway_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_message_feedback" ADD CONSTRAINT "gateway_message_feedback_assistant_message_id_fkey" FOREIGN KEY ("assistant_message_id") REFERENCES "gateway_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
