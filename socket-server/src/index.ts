import express, { Request, Response } from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

// ✅ carrega .env só em dev, sem importar dotenv em produção
if (process.env.NODE_ENV !== "production") {
  import("dotenv")
    .then((dotenv) => dotenv.config())
    .catch(() => {
      /* se não tiver dotenv instalado em dev por algum motivo, só ignora */
    });
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

  // ===== DMs =====

  socket.on("dm:join", ({ conversationId }: { conversationId: string }) => {
    if (!conversationId) return;
    socket.join(`dm:${conversationId}`);
    // console.log("[dm] join", conversationId, userId);
  });

  socket.on("dm:leave", ({ conversationId }: { conversationId: string }) => {
    if (!conversationId) return;
    socket.leave(`dm:${conversationId}`);
  });

  /**
   * Agora o front:
   * 1) faz POST /api/dm/messages (salva no banco)
   * 2) recebe { message } já plaintext
   * 3) emite socket "dm:send" com esse objeto salvo
   *
   * Então aqui a gente só retransmite pra sala.
   */
// front já salva no Next em /api/dm/messages
// aqui a gente só retransmite pra sala
socket.on("dm:send", (rawMessage: any) => {
  const conversationId = rawMessage?.conversationId;
  if (!conversationId) return;

  const room = `dm:${conversationId}`;

  const message = {
    ...rawMessage,
    content: rawMessage.content ?? rawMessage.text ?? "",
    fromUserId: rawMessage.fromUserId ?? userId,
  };

  io.to(room).emit("dm:new", message);
  io.to(room).emit("dm:message", message); // compat
});


  // ===== resto dos teus handlers de lobby/presence continuam aqui =====
});

const PORT = Number(process.env.SOCKET_PORT || 4000);
server.listen(PORT, () => {
  console.log(`Socket server on http://localhost:${PORT}`);
});
