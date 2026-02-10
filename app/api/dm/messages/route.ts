import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encryptMessage, decryptMessage } from "@/lib/crypto";
import { triggerDM } from "@/lib/pusher";

// LISTAR mensagens (já descriptografadas)
export async function GET(req: Request) {
  try {
    const meUser = await getCurrentUser();
    const me = meUser?.id;

    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // valida participação
    const isParticipant = await prisma.directParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: me,
        },
      },
      select: { id: true },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const msgs = await prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        fromUser: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    // <-- AQUI a mágica: devolve content já legível
    const messages = msgs.map((m: any) => ({
      id: m.id,
      conversationId: m.conversationId,
      fromUserId: m.fromUserId,
      content: decryptMessage(m.ciphertext, m.iv, m.authTag),
      algorithm: m.algorithm,
      createdAt: m.createdAt,
      editedAt: m.editedAt,
      deletedAt: m.deletedAt,
      fromUser: m.fromUser,
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("DM messages error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ENVIAR mensagem
export async function POST(req: Request) {
  try {
    const meUser = await getCurrentUser();
    const me = meUser?.id;

    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, content } = body as {
      conversationId?: string;
      content?: string;
    };

    if (!conversationId || !content?.trim()) {
      return NextResponse.json(
        { error: "conversationId and content are required" },
        { status: 400 }
      );
    }

    // valida participação
    const isParticipant = await prisma.directParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: me,
        },
      },
      select: { id: true },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const enc = encryptMessage(content);

    const msg = await prisma.directMessage.create({
      data: {
        conversationId,
        fromUserId: me,
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
        algorithm: enc.algorithm,
      },
      include: {
        fromUser: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    await prisma.directConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // =============================
    // ✅ PUSHER: Envia em tempo real
    // =============================
    const messagePayload = {
      id: msg.id,
      conversationId: msg.conversationId,
      fromUserId: msg.fromUserId,
      content, // plaintext (só vai pra membros autorizados)
      algorithm: msg.algorithm,
      createdAt: msg.createdAt,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
      fromUser: msg.fromUser,
    };

    // Envia para canal privado da conversa
    await triggerDM(conversationId, "new-message", messagePayload);

    // devolve também já descriptografada pro front
    return NextResponse.json({ message: messagePayload });
    
  } catch (err) {
    console.error("DM POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}