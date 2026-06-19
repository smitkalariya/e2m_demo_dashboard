import { InteractionDetailView } from "@/features/interactions/components/InteractionDetailView";

export default async function InteractionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InteractionDetailView interactionId={id} />;
}
