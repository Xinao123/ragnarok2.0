"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";

type OtherUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type MessageVM = {
  id: string;
  fromUserId: string;
  content: string;          // <- API manda content plaintext
  createdAt: string;
  fromUser?: {
    id: string;
    name?: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

// aceita msg vindo da API (content) ou socket antigo (text)
function normalizeMessage(raw: any): MessageVM {
  return {
    id: raw.id,
    fromUserId: raw.fromUserId,
    content: raw.content ?? raw.text ?? "",
    createdAt: raw.createdAt,
    fromUser: raw.fromUser,
  };
}

export function DMClient({
  conversationId,
  meId,
  otherUser,
}: {
  conversationId: string;
  meId: string;
  otherUser: OtherUser | null;
}) {
  const [messages, setMessages] = useState<MessageVM[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function loadMessages() {
    // aborta fetch anterior (troca de conversa)
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setLoadError(null);

      const res = await fetch(
        `/api/dm/messages?conversationId=${conversationId}`,
        {
          cache: "no-store",
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        throw new Error(`Falha ao carregar mensagens (${res.status})`);
      }

      const json = (await res.json()) as { messages: any[] };
      setMessages((json.messages || []).map(normalizeMessage));
    } catch (e: any) {
      // silencia AbortError (não é bug)
      if (e?.name === "AbortError") return;

      console.error(e);
      setLoadError("Não foi possível carregar as mensagens.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // realtime socket
  useEffect(() => {
    const socket = getSocket(meId);

    socket.emit("dm:join", { conversationId });

    const onNew = (raw: any) => {
      const msg = normalizeMessage(raw);
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    socket.on("dm:new", onNew);
    socket.on("dm:message", onNew); // compat

    return () => {
      socket.off("dm:new", onNew);
      socket.off("dm:message", onNew);
      socket.emit("dm:leave", { conversationId });
    };
  }, [conversationId, meId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    try {
      // 1) salva no banco via API
      const res = await fetch("/api/dm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: trimmed,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const { message } = await res.json();
      const saved = normalizeMessage(message);

      // 2) UI local
      setMessages((prev) => [...prev, saved]);

      // 3) realtime
      const socket = getSocket(meId);
      socket.emit("dm:send", saved);

      setText("");
    } catch (e) {
      console.error(e);
      setError("Não foi possível enviar sua mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 flex flex-col gap-3 min-h-[60vh]">
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {loading && (
          <p className="text-xs text-slate-400">Carregando conversa...</p>
        )}

        {loadError && (
          <p className="text-xs text-rose-300">{loadError}</p>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <p className="text-xs text-slate-500">
            Nenhuma mensagem ainda. Dê um oi pra{" "}
            <span className="text-slate-200">
              {otherUser?.username || "jogador"}
            </span>{" "}
            🙂
          </p>
        )}

        {messages.map((m) => {
          const mine = m.fromUserId === meId;
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                mine
                  ? "ml-auto bg-sky-600/20 border border-sky-500/40 text-slate-100"
                  : "bg-slate-900 border border-slate-800 text-slate-100"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {error && <p className="text-[11px] text-rose-300">{error}</p>}

      <form onSubmit={sendMessage} className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
        />
        <button
          disabled={sending}
          className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
