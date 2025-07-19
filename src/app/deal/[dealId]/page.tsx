import ChatLayout from '@/components/deal/ChatLayout';

export default async function DealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params;
  
  return (
    <div>
      <ChatLayout dealId={dealId} />
    </div>
  );
} 