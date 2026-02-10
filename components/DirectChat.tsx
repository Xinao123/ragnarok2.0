"use client";

import { useEffect, useRef, useState } from "react";
import { getPusherClient } from "@/lib/pusher";

type ChatUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
};

type DirectMessage = {
  id: string;
  conversationId: string;
  content: string; // plaintext vindo do server
  createdAt: string;
  fromUserId: string;
  fromUser: ChatUser;
};

type Props = {
  conversationId: string;
  meId: string;
};

export function DirectChat({ conversationId, meId }: Props) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rtError, setRtError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // =============================
  // ✅ PUSHER: Real-time messages
  // =============================
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) {
      console.warn("[DirectChat] Pusher client não disponível");
      return;
    }

    const channelName = `private-dm-${conversationId}`;
    
    try {
      const channel = pusher.subscribe(channelName);

      // Bind no evento de nova mensagem
      const onNewMessage = (data: DirectMessage) => {
        console.log("[DirectChat] Nova mensagem recebida:", data);
        
        setMessages((prev) => {
          // Evita duplicatas (por causa do optimistic update)
          if (prev.some((m) => m.id === data.id)) {
            return prev;
          }
          return [...prev, data];
        });
      };

      const onSubError = (status: any) => {
        console.error("[DirectChat] Erro de subscrição:", status);
        setRtError("Falha ao conectar em tempo real.");
      };

      const onSubSuccess = () => {
        setRtError(null);
      };

      const onConnError = (err: any) => {
        console.error("[DirectChat] Erro de conexão:", err);
        const data = err?.error?.data;
        const detail =
          data?.message || data?.code
            ? ` (${data?.code ?? "sem-codigo"}: ${data?.message ?? "sem-mensagem"})`
            : "";
        setRtError(`Erro de conexão em tempo real.${detail}`);
      };

      channel.bind("new-message", onNewMessage);
      channel.bind("pusher:subscription_error", onSubError);
      channel.bind("pusher:subscription_succeeded", onSubSuccess);
      pusher.connection.bind("error", onConnError);

      // Log de erros de conexão
      // Cleanup
      return () => {
        channel.unbind("new-message", onNewMessage);
        channel.unbind("pusher:subscription_error", onSubError);
        channel.unbind("pusher:subscription_succeeded", onSubSuccess);
        pusher.connection.unbind("error", onConnError);
        pusher.unsubscribe(channelName);
      };
    } catch (err) {
      console.error("[DirectChat] Erro ao conectar Pusher:", err);
      setError("Erro de conexão. Recarregue a página.");
    }
  }, [conversationId]);

  // =============================
  // CARREGAR HISTÓRICO
  // =============================
  useEffect(() => {
    async function fetchHistory() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/dm/messages?conversationId=${conversationId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (res.status === 401) {
          setError("Você precisa estar logado para ver o chat.");
          return;
        }

        if (res.status === 403) {
          setError("Você não tem permissão para acessar esta conversa.");
          return;
        }

        if (!res.ok) {
          throw new Error(`Erro ao carregar mensagens (${res.status})`);
        }

        const json = await res.json();
        setMessages(json.messages || []);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("[DirectChat] Erro ao carregar histórico:", err);
        setError("Não foi possível carregar as mensagens.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();

    return () => abortRef.current?.abort();
  }, [conversationId]);

  // =============================
  // AUTO-SCROLL
  // =============================
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // =============================
  // ENVIAR MENSAGEM
  // =============================
  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);

    // ✅ Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: DirectMessage = {
      id: tempId,
      conversationId,
      content: trimmed,
      createdAt: new Date().toISOString(),
      fromUserId: meId,
      fromUser: {
        id: meId,
        username: "Você",
        name: null,
        avatarUrl: null,
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setText("");

    try {
      const res = await fetch("/api/dm/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: trimmed,
        }),
      });

      if (res.status === 401) {
        setError("Faça login para enviar mensagens.");
        // Remove mensagem otimista
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      if (res.status === 403) {
        setError("Você não tem permissão para enviar mensagens aqui.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        return;
      }

      if (!res.ok) {
        throw new Error(`Erro ao enviar (${res.status})`);
      }

      const { message } = await res.json();

      // ✅ Se o realtime chegou antes, remove o temp e mantém a real
      setMessages((prev) => {
        const hasReal = prev.some((m) => m.id === message.id);
        if (hasReal) {
          return prev.filter((m) => m.id !== tempId);
        }
        return prev.map((m) => (m.id === tempId ? message : m));
      });
    } catch (err) {
      console.error("[DirectChat] Erro ao enviar:", err);
      setError("Não foi possível enviar a mensagem.");
      // Remove mensagem otimista
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  // =============================
  // RENDER
  // =============================

  if (!meId) {
    return (
      <div className="text-xs text-slate-400 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        Faça login para usar o chat.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[480px] border border-slate-800 rounded-2xl bg-slate-950/60 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-300 bg-slate-900/70 flex items-center justify-between">
        <span className="font-medium">Chat privado</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-slate-400">Tempo real ativo</span>
        </span>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/40"
      >
        {loading && (
          <p className="text-xs text-slate-500 text-center py-4">
            Carregando mensagens...
          </p>
        )}

        {!loading && error && (
          <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-md px-3 py-2 text-center">
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-4">
            Ainda não há mensagens nessa conversa.
          </p>
        )}

        {messages.map((m) => {
          const isMine = m.fromUserId === meId;
          const initials =
            (m.fromUser?.username || m.fromUser?.name || "J")[0]?.toUpperCase() ??
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
                  {m.fromUser?.avatarUrl ? (
                    <img
                      src={m.fromUser.avatarUrl}
                      alt={m.fromUser.username || "Avatar"}
                      className="h-7 w-7 rounded-full object-cover border border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-200 border border-slate-700 flex-shrink-0">
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
                    {m.fromUser?.username || "Jogador"}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className="text-[9px] text-slate-500 mt-1">
                  {new Date(m.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error bar */}
  {error && !loading && (
    <div className="px-3 py-1 bg-rose-950/40 border-t border-rose-800/60">
      <p className="text-[10px] text-rose-300">{error}</p>
    </div>
  )}
  {rtError && !loading && (
    <div className="px-3 py-1 bg-amber-950/40 border-t border-amber-800/60">
      <p className="text-[10px] text-amber-300">{rtError}</p>
    </div>
  )}

      {/* Input */}
      <div className="p-2 border-t border-slate-800 flex items-center gap-2 bg-slate-900/50">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escreva uma mensagem..."
          disabled={sending || !!error}
          className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim() || !!error}
          className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
