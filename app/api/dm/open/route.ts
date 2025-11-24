import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const meUser = await getCurrentUser();
    const me = meUser?.id;

    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const otherUserId: string | undefined = body?.otherUserId;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      );
    }

    let convo = await prisma.directConversation.findFirst({
      where: {
        participants: {
          some: { userId: me },
          some: { userId: otherUserId },
          every: { userId: { in: [me, otherUserId] } },
        },
      },
      include: { participants: true },
    });

    if (!convo || convo.participants.length !== 2) {
      convo = await prisma.directConversation.create({
        data: {
          participants: {
            create: [{ userId: me }, { userId: otherUserId }],
          },
        },
        include: { participants: true },
      });
    }

    return NextResponse.json({ conversationId: convo.id });
  } catch (err) {
    console.error("DM open error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
