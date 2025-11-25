import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const userSelect = {
    id: true,
    username: true,
    name: true,
    avatarUrl: true,
    status: true,
    lastSeen: true,
};

export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            { error: "Unauthenticated" },
            { status: 401 }
        );
    }

    const [friendships, incoming, outgoing] = await Promise.all([
        prisma.friendship.findMany({
            where: {
                OR: [{ userAId: user.id }, { userBId: user.id }],
            },
            include: {
                userA: { select: userSelect },
                userB: { select: userSelect },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.friendRequest.findMany({
            where: { toUserId: user.id, status: "PENDING" },
            include: {
                fromUser: { select: userSelect },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.friendRequest.findMany({
            where: { fromUserId: user.id, status: "PENDING" },
            include: {
                toUser: { select: userSelect },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const friends = friendships.map((f: any) => {
        const other = f.userAId === user.id ? f.userB : f.userA;
        return other;
    });

    const incomingOut = incoming.map((req: any) => ({
        id: req.id,
        createdAt: req.createdAt,
        fromUser: req.fromUser,
    }));

    const outgoingOut = outgoing.map((req: any) => ({
        id: req.id,
        createdAt: req.createdAt,
        toUser: req.toUser,
    }));

    return NextResponse.json({
        friends,
        incoming: incomingOut,
        outgoing: outgoingOut,
    });
}
