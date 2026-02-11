import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireCsrf } from "@/lib/csrf";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const csrf = await requireCsrf(req);
  if (csrf) return csrf;

  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;

  if (!meId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const limit = await checkRateLimit(req, apiRateLimit, meId);
  if (!limit.success) return limit.response;

  await prisma.user.update({
    where: { id: meId },
    data: { lastSeen: new Date() },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
