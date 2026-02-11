import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { areFriends } from "@/lib/friends";
import { getPusherServer } from "@/lib/pusher";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

type PusherAuthPayload = {
  socket_id?: string;
  channel_name?: string;
};

async function readBody(req: Request): Promise<PusherAuthPayload> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as PusherAuthPayload;
  }

  const raw = await req.text().catch(() => "");
  if (!raw) return {};

  const params = new URLSearchParams(raw);
  return {
    socket_id: params.get("socket_id") ?? undefined,
    channel_name: params.get("channel_name") ?? undefined,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;
  const limit = await checkRateLimit(req, apiRateLimit, meId);
  if (!limit.success) return limit.response;

  if (!meId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { socket_id, channel_name } = await readBody(req);

  if (!socket_id || !channel_name) {
    return NextResponse.json(
      { error: "socket_id and channel_name are required" },
      { status: 400 }
    );
  }

  // ======== DM private channel ========
  if (channel_name.startsWith("private-dm-")) {
    const conversationId = channel_name.replace("private-dm-", "");
    if (!conversationId) {
      return NextResponse.json(
        { error: "invalid channel" },
        { status: 400 }
      );
    }

    const isParticipant = await prisma.directParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: meId,
        },
      },
      select: { id: true },
    });

    if (!isParticipant) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const authResponse = getPusherServer().authorizeChannel(
      socket_id,
      channel_name
    );

    return NextResponse.json(authResponse);
  }

  // ======== Presence channel ========
  if (channel_name.startsWith("presence-user-")) {
    const userId = channel_name.replace("presence-user-", "");
    if (userId !== meId) {
      const isFriend = await areFriends(meId, userId);
      if (!isFriend) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: meId },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });

    const authResponse = getPusherServer().authorizeChannel(socket_id, channel_name, {
      user_id: meId,
      user_info: {
        username: user?.username ?? null,
        name: user?.name ?? null,
        avatarUrl: user?.avatarUrl ?? null,
      },
    });

    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}
