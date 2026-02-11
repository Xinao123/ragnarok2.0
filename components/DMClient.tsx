"use client";

import { useEffect, useRef, useState } from "react";
import { getPusherClient } from "@/lib/pusher";
import { SendHorizonal } from "lucide-react";
import { withCsrf } from "@/lib/csrf-client";

type OtherUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type MessageVM = {
  id: string;
  conversationId: string;
  fromUserId: string;
  content: string;
  createdAt: string;
  fromUser?: {
    id: string;
    name?: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
};

function normalizeMessage(raw: any): MessageVM {
  return {
    id: raw.id,
    conversationId: raw.conversationId ?? raw.conversation?.id ?? "",
    fromUserId: raw.fromUserId,
    content: raw.content ?? raw.text ?? "",
    createdAt: raw.createdAt,
    fromUser: raw.fromUser,
  };
}

function initials(name?: string | null, username?: string | null) {
  const base = name || username || "?";
  const parts = base.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Avatar({
  url,
  name,
  username,
  size = 36,
}: {
  url?: string | null;
  name?: string | null;
  username?: string | null;
  size?: number;
}) {
  const letter = initials(name, username);
  return (
    <div
      className="shrink-0 rounded-full bg-slate-800/80 border border-slate-700 grid place-items-center overflow-hidden text-slate-100 font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name ?? username ?? ""}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name ?? username ?? "avatar"}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{letter}</span>
      )}
    </div>
  );
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
  const [rtError, setRtError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // =============================
  // ✅ PUSHER CLIENT
  // =============================
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-dm-${conversationId}`;
    const channel = pusher.subscribe(channelName);

    // Listener para novas mensagens
    const onNewMessage = (data: any) => {
      const msg = normalizeMessage(data);
      setMessages((prev) => {
        // Evita duplicatas (otimistic update)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onSubscriptionError = (status: any) => {
      console.error("[DM] Pusher subscription error:", status);
      setRtError("Falha ao conectar em tempo real.");
    };

    const onSubscriptionSuccess = () => {
      setRtError(null);
    };

    const onConnectionError = (err: any) => {
      console.error("[DM] Pusher connection error:", err);
      const data = err?.error?.data;
      const detail =
        data?.message || data?.code
          ? ` (${data?.code ?? "sem-codigo"}: ${data?.message ?? "sem-mensagem"})`
          : "";
      setRtError(`Erro de conexao em tempo real.${detail}`);
    };

    channel.bind("new-message", onNewMessage);
    channel.bind("pusher:subscription_error", onSubscriptionError);
    channel.bind("pusher:subscription_succeeded", onSubscriptionSuccess);
    pusher.connection.bind("error", onConnectionError);

    // Cleanup
    return () => {
      channel.unbind("new-message", onNewMessage);
      channel.unbind("pusher:subscription_error", onSubscriptionError);
      channel.unbind("pusher:subscription_succeeded", onSubscriptionSuccess);
      pusher.connection.unbind("error", onConnectionError);
      pusher.unsubscribe(channelName);
    };
  }, [conversationId]);

  // =============================
  // CARREGAR HISTÓRICO
  // =============================
  async function loadMessages() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setLoadError(null);

      const res = await fetch(
        `/api/dm/messages?conversationId=${conversationId}`,
        { cache: "no-store", signal: controller.signal }
      );

      if (!res.ok) throw new Error(`Falha ao carregar mensagens (${res.status})`);

      const json = (await res.json()) as { messages: any[] };
      setMessages((json.messages || []).map(normalizeMessage));
    } catch (e: any) {
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

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =============================
  // ENVIAR MENSAGEM
  // =============================
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch(
        "/api/dm/messages",
        await withCsrf({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content: trimmed }),
        })
      );

      if (!res.ok) throw new Error(await res.text());

      const { message } = await res.json();
      const saved = normalizeMessage(message);

      // ✅ Evita duplicar caso o realtime chegue primeiro
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]
      );

      setText("");
    } catch (e) {
      console.error(e);
      setError("Não foi possível enviar sua mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="relative w-full h-[70vh] md:h-[75vh] flex flex-col rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 overflow-visible shadow-2xl">
      
      {/* Header */}
      <div className="relative z-30 flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/70 backdrop-blur overflow-visible">
        <Avatar
          url={otherUser?.avatarUrl}
          name={otherUser?.name}
          username={otherUser?.username}
          size={40}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-slate-100 font-semibold text-sm md:text-base">
            {otherUser?.name || otherUser?.username || "Jogador"}
          </span>
          <span className="text-slate-400 text-xs">
            @{otherUser?.username || "player"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        className="
          relative z-10 flex-1 overflow-y-auto overflow-x-hidden
          px-3 md:px-4 py-4 space-y-2
          scrollbar-thin
          scrollbar-thumb-slate-700/70 hover:scrollbar-thumb-slate-500/90
          scrollbar-track-slate-900/40
          scrollbar-thumb-rounded-full scrollbar-track-rounded-full
        "
      >
        {loading && (
          <div className="text-center text-slate-400 text-sm">
            Carregando conversa...
          </div>
        )}

        {loadError && (
          <div className="text-center text-rose-300 text-sm">
            {loadError}
          </div>
        )}

        {!loading && !loadError && messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm mt-6">
            Nenhuma mensagem ainda. Dê um oi 🙂
          </div>
        )}

        {messages.map((m, i) => {
          const mine = m.fromUserId === meId;
          const prev = messages[i - 1];
          const next = messages[i + 1];

          const startsGroup = !prev || prev.fromUserId !== m.fromUserId;
          const endsGroup = !next || next.fromUserId !== m.fromUserId;

          return (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
            >
              {!mine && (
                <div className="w-9">
                  {startsGroup ? (
                    <Avatar
                      url={m.fromUser?.avatarUrl}
                      name={m.fromUser?.name}
                      username={m.fromUser?.username}
                      size={34}
                    />
                  ) : (
                    <div className="w-[34px] h-[34px]" />
                  )}
                </div>
              )}

              <div className="max-w-[78%] md:max-w-[65%]">
                {startsGroup && !mine && (
                  <div className="text-[11px] text-slate-400 mb-1 ml-1">
                    {m.fromUser?.name || m.fromUser?.username || "Jogador"}
                  </div>
                )}

                <div
                  className={[
                    "px-3 py-2 md:px-4 md:py-2.5 text-sm md:text-[15px] leading-relaxed break-words",
                    mine
                      ? "bg-sky-500/15 border border-sky-400/30 text-slate-50 rounded-2xl rounded-br-md"
                      : "bg-slate-900/80 border border-slate-800 text-slate-100 rounded-2xl rounded-bl-md",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>

                {endsGroup && (
                  <div
                    className={`text-[10px] text-slate-500 mt-1 ${
                      mine ? "text-right mr-1" : "text-left ml-1"
                    }`}
                  >
                    {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>

              {mine && (
                <div className="w-9">
                  {endsGroup ? (
                    <Avatar url={null} name="Você" username="me" size={28} />
                  ) : (
                    <div className="w-[28px] h-[28px]" />
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 pb-2 text-[12px] text-rose-300">{error}</div>
      )}
      {rtError && (
        <div className="px-4 pb-2 text-[12px] text-amber-300">{rtError}</div>
      )}

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="sticky bottom-0 flex items-center gap-2 px-3 md:px-4 py-3 border-t border-slate-800 bg-slate-950/80 backdrop-blur"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="flex-1 rounded-2xl bg-slate-900/80 border border-slate-700 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        />
        <button
          disabled={sending}
          className="grid place-items-center rounded-2xl bg-sky-600 hover:bg-sky-500 w-11 h-11 text-white disabled:opacity-60 transition"
          aria-label="Enviar"
          title="Enviar"
        >
          <SendHorizonal size={18} />
        </button>
      </form>
    </div>
  );
}
