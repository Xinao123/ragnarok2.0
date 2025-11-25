import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;

  if (!meId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // ✅ Só atualiza presença/lastSeen
  // ❌ NÃO mexe no status aqui
  await prisma.user.update({
    where: { id: meId },
    data: { lastSeen: new Date() },
    select: { id: true },
  });

  return NextResponse.json({ ok: true });
}
