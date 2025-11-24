import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { lastSeen: new Date() },
    });

    return NextResponse.json({ ok: true });
}
