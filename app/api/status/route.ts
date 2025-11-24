import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { UserStatus } from "@prisma/client";

const ALLOWED: UserStatus[] = [
  "ONLINE",
  "AWAY",
  "BUSY",
  "INVISIBLE",
  "OFFLINE",
];

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body?.status as UserStatus | undefined;

  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json(
      { error: "Invalid status" },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      status,
      lastSeen: new Date(),
    },
    select: { status: true, lastSeen: true },
  });

  return NextResponse.json(updated);
}
