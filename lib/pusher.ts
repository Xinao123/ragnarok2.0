// lib/pusher.ts
import Pusher from "pusher";
import PusherClient from "pusher-js";

// =============================
// SERVER-SIDE (API Routes)
// =============================
let pusherServer: Pusher | null = null;

export function getPusherServer() {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

// =============================
// CLIENT-SIDE (React Components)
// =============================
let pusherClient: PusherClient | null = null;

export function getPusherClient() {
  if (typeof window === "undefined") return null;

  if (
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    console.warn("[Pusher] Missing NEXT_PUBLIC_PUSHER_KEY/CLUSTER");
    return null;
  }

  if (!pusherClient) {
    pusherClient = new PusherClient(
      process.env.NEXT_PUBLIC_PUSHER_KEY!,
      {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/pusher/auth",
        // ✅ Autenticação automática via cookie/session
      }
    );
  }
  return pusherClient;
}

// =============================
// HELPERS
// =============================

/**
 * Envia mensagem para um canal privado
 */
export async function triggerDM(
  conversationId: string,
  event: string,
  data: any
) {
  const pusher = getPusherServer();
  await pusher.trigger(
    `private-dm-${conversationId}`,
    event,
    data
  );
}

/**
 * Envia atualização de presença (amigo ficou online)
 */
export async function triggerPresence(
  userId: string,
  status: string,
  lastSeen?: Date | string | null
) {
  const pusher = getPusherServer();
  const lastSeenIso =
    lastSeen instanceof Date
      ? lastSeen.toISOString()
      : lastSeen ?? null;

  await pusher.trigger(
    `presence-user-${userId}`,
    "status-changed",
    { userId, status, lastSeen: lastSeenIso }
  );
}
