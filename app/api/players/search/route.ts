import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const query = q.trim();

    // se não tiver texto, não retornamos nada
    if (!query) {
        return NextResponse.json({ users: [] });
    }

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { username: { contains: query, mode: "insensitive" } },
                { name: { contains: query, mode: "insensitive" } },
            ],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
        },
    });

    return NextResponse.json({ users });
}
