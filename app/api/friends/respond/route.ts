import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { requireCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
    const csrf = await requireCsrf(req);
    if (csrf) return csrf;

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const limit = await checkRateLimit(req, apiRateLimit, currentUser.id);
    if (!limit.success) return limit.response;

    let payload: { requestId?: string; action?: string };
    try {
        payload = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const requestId = payload.requestId;
    const action = payload.action;

    if (!requestId || (action !== "ACCEPT" && action !== "DECLINE")) {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const friendRequest = await prisma.friendRequest.findUnique({
        where: { id: requestId },
    });

    if (!friendRequest) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // só o destinatário pode responder
    if (friendRequest.toUserId !== currentUser.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (friendRequest.status !== "PENDING") {
        return NextResponse.json(
            { error: "Request already handled" },
            { status: 400 },
        );
    }

    if (action === "ACCEPT") {
        const userAId =
            friendRequest.fromUserId < friendRequest.toUserId
                ? friendRequest.fromUserId
                : friendRequest.toUserId;
        const userBId =
            friendRequest.fromUserId < friendRequest.toUserId
                ? friendRequest.toUserId
                : friendRequest.fromUserId;

        // evita duplicar amizade
        const existingFriendship = await prisma.friendship.findFirst({
            where: { userAId, userBId },
        });

        if (!existingFriendship) {
            await prisma.friendship.create({
                data: {
                    userAId,
                    userBId,
                },
            });
        }

        await prisma.friendRequest.update({
            where: { id: friendRequest.id },
            data: { status: "ACCEPTED", respondedAt: new Date() },
        });

        return NextResponse.json({ success: true, status: "ACCEPTED" });
    } else {
        // DECLINE
        await prisma.friendRequest.update({
            where: { id: friendRequest.id },
            data: { status: "DECLINED", respondedAt: new Date() },
        });

        return NextResponse.json({ success: true, status: "DECLINED" });
    }
}
