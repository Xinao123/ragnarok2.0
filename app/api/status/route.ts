import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const ALLOWED = ["ONLINE", "AWAY", "BUSY", "INVISIBLE", "OFFLINE"] as const;
type StatusValue = (typeof ALLOWED)[number];

export async function POST(req: Request) {
  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;

  if (!meId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body?.status as StatusValue | undefined;

  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: meId },
    data: {
      status,
      lastSeen: new Date(), // opcional, mas bom pra presença
    },
  });

  return NextResponse.json({ ok: true, status });
}
