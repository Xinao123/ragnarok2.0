import { io, Socket } from "socket.io-client";

declare global {
  // evita recriar socket no HMR/dev
  // eslint-disable-next-line no-var
  var __ragnarokSocket: Socket | undefined;
}

export function getSocket(userId: string) {
  const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

  if (!globalThis.__ragnarokSocket) {
    globalThis.__ragnarokSocket = io(url, {
      transports: ["websocket"],
      auth: { userId },
      autoConnect: true,
    });

    globalThis.__ragnarokSocket.on("connect_error", (err) => {
      console.error("[socket] connect_error:", err.message);
    });
  } else {
    // garante auth correta se mudou userId
    const cur = (globalThis.__ragnarokSocket.auth as any)?.userId;
    if (cur !== userId) {
      globalThis.__ragnarokSocket.auth = { userId };
      if (!globalThis.__ragnarokSocket.connected) {
        globalThis.__ragnarokSocket.connect();
      }
    }
  }

  return globalThis.__ragnarokSocket;
}
