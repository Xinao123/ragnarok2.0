// lib/socket-client.ts
"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string) {
  if (socket) return socket;

  const url = process.env.NEXT_PUBLIC_SOCKET_URL!;
  socket = io(url, {
    transports: ["websocket"],
    auth: { userId },           
    autoConnect: true,
  });

  return socket;
}
