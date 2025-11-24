"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

type ChatUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type DirectMessage = {
  id: string;
  conversationId: string;
  text: string;            // plaintext vindo do server
  createdAt: string;
  fromUser: ChatUser;
};

export function DirectChat({ conversationId }: { conversationId: string }) {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL!;

  // histórico
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/dm/${conversationId}/messages`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setMessages(json);
      }
      setLoading(false);
    })();
  }, [conversationId]);

  // realtime
  useEffect(() => {
    if (!userId) return;

    const socket = io(socketUrl, {
      auth: { userId },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("dm:join", { conversationId });
    });

    socket.on("dm:new", (msg: DirectMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.emit("dm:leave", { conversationId });
      socket.disconnect();
    };
  }, [conversationId, socketUrl, userId]);

  // auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function send() {
    if (!text.trim()) return;
    socketRef.current?.emit("dm:send", {
      conversationId,
      text: text.trim(),
    });
    setText("");
  }

  if (!userId) {
    return (
      <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        Faça login para usar o chat.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[480px] border border-slate-800 rounded-2xl bg-slate-950/60 overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-300">
        Chat privado
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <p className="text-xs text-slate-500">Carregando mensagens...</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Ainda não há mensagens nessa conversa.
          </p>
        )}

        {messages.map(m => {
          const isMine = m.fromUser.id === userId;
          const initials =
            (m.fromUser.username || m.fromUser.name || "J")[0]?.toUpperCase() ??
            "J";

          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              {!isMine && (
                <>
                  {m.fromUser.avatarUrl ? (
                    <img
                      src={m.fromUser.avatarUrl}
                      className="h-7 w-7 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-200 border border-slate-700">
                      {initials}
                    </div>
                  )}
                </>
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed border ${
                  isMine
                    ? "bg-sky-600/20 border-sky-500/40 text-slate-50"
                    : "bg-slate-900/70 border-slate-800 text-slate-100"
                }`}
              >
                {!isMine && (
                  <p className="text-[10px] text-slate-400 mb-0.5">
                    {m.fromUser.username || "Jogador"}
                  </p>
                )}
                <p>{m.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-slate-800 flex items-center gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500"
        />
        <button
          onClick={send}
          className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-white"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
