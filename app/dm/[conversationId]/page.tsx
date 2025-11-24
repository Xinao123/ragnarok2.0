// app/dm/[conversationId]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DMClient } from "@/components/DMClient"; // ou "@/components/dm/DMClient" se vc mover pra subpasta

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function DMPage({ params }: PageProps) {
  const me = await getCurrentUser();
  if (!me) redirect("/auth/login");

  const { conversationId } = await params;
  if (!conversationId) notFound();

  const convo = await prisma.directConversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { include: { user: true } },
    },
  });

  if (!convo) notFound();

  const isMember = convo.participants.some((p) => p.userId === me.id);
  if (!isMember) notFound();

  const other = convo.participants
    .map((p) => p.user)
    .find((u) => u.id !== me.id);

  return (
    <div className="space-y-4">
      <DMClient
        conversationId={convo.id}
        meId={me.id}
        otherUser={other ?? null}
      />
    </div>
  );
}
