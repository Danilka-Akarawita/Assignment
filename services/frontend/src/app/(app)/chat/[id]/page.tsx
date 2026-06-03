import { ChatPanel } from '@/components/chat/chat-panel';

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const conversationId = parseInt(id, 10);

  if (Number.isNaN(conversationId)) {
    return <p className="p-6 text-sm text-destructive">Invalid conversation id</p>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col p-4">
      <ChatPanel conversationId={conversationId} />
    </div>
  );
}
