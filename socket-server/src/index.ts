import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";


// ✅ carrega .env só em dev, sem importar dotenv em produção
if (process.env.NODE_ENV !== "production") {
  import("dotenv")
    .then((dotenv) => dotenv.config())
    .catch(() => {});
}

const app = express();
app.use(cors({ origin: "*" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

// auth simples: userId vem no handshake
io.use((socket, next) => {
  const userId = socket.handshake.auth?.userId as string | undefined;
  if (!userId) return next(new Error("unauthorized"));
  socket.data.userId = userId;
  next();
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;

  // log seguro (sem dados do chat)
  console.log("[socket] connected:", socket.id, "user:", userId);

  // ===== DMs =====

  socket.on("dm:join", ({ conversationId }: { conversationId: string }) => {
    if (!conversationId) return;
    const room = `dm:${conversationId}`;
    socket.join(room);

    // log seguro
    console.log("[dm] join:", room, "socket:", socket.id);
  });

  socket.on("dm:leave", ({ conversationId }: { conversationId: string }) => {
    if (!conversationId) return;
    const room = `dm:${conversationId}`;
    socket.leave(room);

    // log seguro
    console.log("[dm] leave:", room, "socket:", socket.id);
  });

  /**
   * Fluxo:
   * front salva em /api/dm/messages -> recebe {message}
   * emite "dm:send" com a mensagem pronta.
   * Aqui só retransmite pra sala.
   */
  socket.on("dm:send", (rawMessage: any) => {
    const conversationId =
      rawMessage?.conversationId ?? rawMessage?.conversation?.id;

    if (!conversationId) return;

    const room = `dm:${conversationId}`;

    const message = {
      ...rawMessage,
      conversationId,
      content: rawMessage.content ?? rawMessage.text ?? "",
      fromUserId: rawMessage.fromUserId ?? userId,
    };

    // log seguro: só metadata
    console.log("[dm] broadcast:", room, "msgId:", message.id);

    io.to(room).emit("dm:new", message);
    io.to(room).emit("dm:message", message);
  });

  socket.on("disconnect", () => {
    console.log("[socket] disconnected:", socket.id, "user:", userId);
  });
});

const PORT = Number(process.env.SOCKET_PORT || 4000);
server.listen(PORT, () => {
  console.log(`Socket server on http://localhost:${PORT}`);
});
