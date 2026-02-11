// lib/pusher.ts
import Pusher from "pusher";
import PusherClient from "pusher-js";

// =============================
// SERVER-SIDE (API Routes)
// =============================
let pusherServer: Pusher | null = null;

function getRequiredPusherEnv(): {
  appId: string;
  key: string;
  secret: string;
  cluster: string;
} {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  const missing: string[] = [];
  if (!appId) missing.push("PUSHER_APP_ID");
  if (!key) missing.push("NEXT_PUBLIC_PUSHER_KEY");
  if (!secret) missing.push("PUSHER_SECRET");
  if (!cluster) missing.push("NEXT_PUBLIC_PUSHER_CLUSTER");

  if (missing.length > 0) {
    throw new Error(
      `[pusher] Missing required env vars: ${missing.join(", ")}`
    );
  }

  return {
    appId: appId as string,
    key: key as string,
    secret: secret as string,
    cluster: cluster as string,
  };
}

export function getPusherServer() {
  if (!pusherServer) {
    const env = getRequiredPusherEnv();
    pusherServer = new Pusher({
      appId: env.appId,
      key: env.key,
      secret: env.secret,
      cluster: env.cluster,
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
