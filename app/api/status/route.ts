import { prisma } from "@/lib/prisma";
import { triggerPresence } from "@/lib/pusher";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { checkRateLimit, statusChangeLimit } from "@/lib/rate-limit";
import { requireCsrf } from "@/lib/csrf";

const ALLOWED = ["ONLINE", "AWAY", "BUSY", "INVISIBLE", "OFFLINE"] as const;
type StatusValue = (typeof ALLOWED)[number];

export async function POST(req: Request) {
  const csrf = requireCsrf(req);
  if (csrf) return csrf;

  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;

  if (!meId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit(req, statusChangeLimit, meId);
  if (!limit.success) return limit.response;

  const body = await req.json().catch(() => ({}));
  const status = body?.status as StatusValue | undefined;

  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: meId },
    data: {
      status,
      lastSeen: new Date(),
    },
    select: { id: true, status: true, lastSeen: true },
  });

  // Se estiver invisivel, divulga OFFLINE para os outros
  const broadcastStatus = status === "INVISIBLE" ? "OFFLINE" : status;
  try {
    await triggerPresence(updated.id, broadcastStatus, updated.lastSeen);
  } catch (err) {
    console.error("[status] Pusher trigger failed:", err);
  }

  return NextResponse.json({ ok: true, status });
}
