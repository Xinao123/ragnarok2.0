import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { requireCsrf } from "@/lib/csrf";
import { logError } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const csrf = await requireCsrf(req);
    if (csrf) return csrf;

    const me = await getCurrentUser();
    if (!me?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const limit = await checkRateLimit(req, apiRateLimit, me.id);
    if (!limit.success) return limit.response;

    const body = await req.json().catch(() => ({}));
    const otherUserId = body?.otherUserId || body?.toUserId;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      );
    }

    if (otherUserId === me.id) {
      return NextResponse.json(
        { error: "cannot open dm with yourself" },
        { status: 400 }
      );
    }

    const existing = await prisma.directConversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: me.id } } },
          { participants: { some: { userId: otherUserId } } },
          { participants: { every: { userId: { in: [me.id, otherUserId] } } } },
        ],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ conversationId: existing.id });
    }

    const created = await prisma.directConversation.create({
      data: {
        participants: {
          create: [
            { userId: me.id },
            { userId: otherUserId },
          ],
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ conversationId: created.id });
  } catch (e) {
    logError("dm/open error", e);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 }
    );
  }
}
