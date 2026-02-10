"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Users,
  UserPlus,
  Loader2,
  X,
  ChevronDown,
  UserCheck,
  Send,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getPusherClient } from "@/lib/pusher";

type StatusValue = "ONLINE" | "AWAY" | "BUSY" | "INVISIBLE" | "OFFLINE";

function displayStatus(status: StatusValue, lastSeen?: string | null) {
  // invisível vira offline pros outros
  if (status === "INVISIBLE") return "OFFLINE";

  if (!lastSeen) return status;

  const last = new Date(lastSeen).getTime();
  const now = Date.now();
  const diff = now - last;

  // se ficou mais de 5 min sem heartbeat => offline
  if (diff > 5 * 60 * 1000) return "OFFLINE";

  // ✅ não "re-anima" OFFLINE pra ONLINE
  return status;
}


function statusDotClass(s: StatusValue) {
  switch (s) {
    case "ONLINE":
      return "bg-emerald-400";
    case "AWAY":
      return "bg-yellow-400";
    case "BUSY":
      return "bg-rose-400";
    case "INVISIBLE":
      return "bg-slate-500";
    default:
      return "bg-slate-600";
  }
}

type FriendUser = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl: string | null;
  status: StatusValue;
  lastSeen: string | null;
};

type IncomingRequest = {
  id: string;
  createdAt: string;
  fromUser: FriendUser;
};

type OutgoingRequest = {
  id: string;
  createdAt: string;
  toUser: FriendUser;
};

type FriendsOverview = {
  friends: FriendUser[];
  incoming: IncomingRequest[];
  outgoing: OutgoingRequest[];
};

type RespondAction = "ACCEPT" | "DECLINE";

export function FriendsDock() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FriendsOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [friendsExpanded, setFriendsExpanded] = useState(true);
  const [incomingExpanded, setIncomingExpanded] = useState(true);
  const [outgoingExpanded, setOutgoingExpanded] = useState(true);

  const [refreshKey, setRefreshKey] = useState(0);

  const [responding, setResponding] = useState<{
    id: string;
    action: RespondAction;
  } | null>(null);

  // ✅ loading individual ao abrir DM
  const [openingDmId, setOpeningDmId] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  const friends = data?.friends ?? [];
  const incoming = data?.incoming ?? [];
  const outgoing = data?.outgoing ?? [];
  const friendIds = friends.map((f) => f.id).join("|");

  const hasData =
    friends.length > 0 || incoming.length > 0 || outgoing.length > 0;

  async function fetchOverview(
    signal?: AbortSignal,
    opts?: { silent?: boolean }
  ) {
    if (!opts?.silent) setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/friends/overview", {
        signal,
        cache: "no-store",
      });

      if (res.status === 401) {
        setError("Faça login para ver seus amigos.");
        setData(null);
        return;
      }

      if (!res.ok) throw new Error("Erro ao carregar amigos");

      const json = (await res.json()) as FriendsOverview;
      setData(json);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        setError("Não foi possível carregar os dados agora.");
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    fetchOverview(controller.signal);

    const interval = setInterval(() => {
      fetchOverview(undefined, { silent: true });
    }, 5000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [open, refreshKey]);

  // =============================
  // Realtime: atualiza status dos amigos via Pusher
  // =============================
  useEffect(() => {
    if (!open || friends.length === 0) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const onStatusChanged = (payload: any) => {
      const userId = payload?.userId as string | undefined;
      const status = payload?.status as StatusValue | undefined;
      const lastSeen = payload?.lastSeen as string | undefined;

      if (!userId || !status) return;

      setData((prev) => {
        if (!prev) return prev;
        const nextFriends = prev.friends.map((f) =>
          f.id === userId
            ? {
                ...f,
                status,
                lastSeen: lastSeen ?? new Date().toISOString(),
              }
            : f
        );
        return { ...prev, friends: nextFriends };
      });
    };

    const onSubError = (status: any) => {
      console.error("[FriendsDock] Pusher subscription error:", status);
    };

    const channels: { name: string; channel: any }[] = [];

    friends.forEach((friend) => {
      const channelName = `presence-user-${friend.id}`;
      const channel = pusher.subscribe(channelName);
      channel.bind("status-changed", onStatusChanged);
      channel.bind("pusher:subscription_error", onSubError);
      channels.push({ name: channelName, channel });
    });

    return () => {
      channels.forEach(({ name, channel }) => {
        channel.unbind("status-changed", onStatusChanged);
        channel.unbind("pusher:subscription_error", onSubError);
        pusher.unsubscribe(name);
      });
    };
  }, [open, friendIds]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const panel = panelRef.current;
      const toggle = toggleButtonRef.current;

      if (
        panel &&
        !panel.contains(target) &&
        (!toggle || !toggle.contains(target))
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  async function handleRespond(requestId: string, action: RespondAction) {
    setResponding({ id: requestId, action });
    setError(null);

    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });

      if (res.status === 401) {
        setError("Faça login para responder solicitações.");
        return;
      }

      if (!res.ok) throw new Error("Erro ao responder solicitação");

      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error(err);
        setError("Não foi possível atualizar a solicitação agora.");
      }
    } finally {
      setResponding(null);
    }
  }

  // ✅ abre DM com amigo (manda otherUserId como esperado pelo backend)
  async function openDmWithFriend(friend: FriendUser) {
    if (!friend?.id) return;

    setOpeningDmId(friend.id);
    setError(null);

    try {
      const res = await fetch("/api/dm/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otherUserId: friend.id, // ✅ principal
          toUserId: friend.id,    // ✅ fallback (não custa nada)
          username: friend.username ?? undefined,
        }),
      });

      if (res.status === 401) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `status ${res.status}`);
      }

      const json = await res.json();
      if (!json?.conversationId) {
        throw new Error("Resposta inválida do servidor.");
      }

      setOpen(false);
      router.push(`/dm/${json.conversationId}`);
    } catch (e: any) {
      console.error(e);
      setError(
        `Falha ao abrir conversa. (${e?.message || "erro desconhecido"})`
      );
    } finally {
      setOpeningDmId(null);
    }
  }

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-16 right-4 md:right-6 z-50 w-[280px] md:w-[320px]"
        >
          <Card className="border-slate-800 bg-slate-950/95 shadow-2xl shadow-slate-950/80 rounded-2xl">
            <CardContent className="px-3 py-3 space-y-3 text-xs text-slate-200">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-sky-600/20 border border-sky-500/40 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5 text-sky-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold">
                      Social rápido
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Amigos e pedidos de amizade
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Badges de resumo */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>{friends.length} amigo(s)</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                  <span>{incoming.length} recebidos</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-slate-700 px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  <span>{outgoing.length} enviados</span>
                </span>
              </div>

              {loading && !data && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Carregando seus amigos...</span>
                </div>
              )}

              {error && (
                <div className="text-[11px] text-slate-300 bg-slate-900/80 border border-slate-700 rounded-md px-2 py-2">
                  {error === "Faça login para ver seus amigos." ||
                  error === "Faça login para responder solicitações." ? (
                    <>
                      <p>{error}</p>
                      <Link
                        href="/auth/login"
                        className="mt-1 inline-block text-sky-400 hover:text-sky-300"
                      >
                        Fazer login
                      </Link>
                    </>
                  ) : (
                    <p>{error}</p>
                  )}
                </div>
              )}

              {!loading && !error && !hasData && (
                <p className="text-[11px] text-slate-400 border border-slate-800 rounded-md px-3 py-2 bg-slate-950/70">
                  Você ainda não adicionou amigos e não possui solicitações
                  pendentes. Comece visitando{" "}
                  <Link
                    href="/players"
                    className="text-sky-400 hover:text-sky-300"
                  >
                    outros jogadores
                  </Link>
                  .
                </p>
              )}

              {!error && (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {/* Amigos */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setFriendsExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3 h-3 text-emerald-300" />
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          Amigos
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {friends.length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {friends.length} contato(s)
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 transition-transform ${
                            friendsExpanded ? "" : "-rotate-90"
                          }`}
                        />
                      </div>
                    </button>

                    {friendsExpanded && (
                      <>
                        {friends.length === 0 ? (
                          <p className="text-[11px] text-slate-500">
                            Você ainda não possui amigos adicionados.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {friends.map((friend) => {
                              const initials =
                                (friend.username ||
                                  friend.name ||
                                  "J")[0]?.toUpperCase() ?? "J";
                              const href = friend.username
                                ? `/u/${friend.username}`
                                : "#";

                              const s = displayStatus(
                                friend.status,
                                friend.lastSeen
                              );

                              const opening = openingDmId === friend.id;

                              return (
                                <div
                                  key={friend.id}
                                  className="flex items-center justify-between gap-2 rounded-md bg-slate-900/70 hover:bg-slate-900 px-2 py-1.5 border border-slate-800"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {friend.avatarUrl ? (
                                      <img
                                        src={friend.avatarUrl}
                                        alt={`Avatar de ${friend.username}`}
                                        className="h-7 w-7 rounded-full object-cover border border-slate-700"
                                      />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] text-slate-200 border border-slate-700">
                                        {initials}
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className={`h-2 w-2 rounded-full ${statusDotClass(
                                            s as StatusValue
                                          )} border border-slate-900`}
                                        />
                                        <p className="text-[11px] text-slate-100 truncate">
                                          {friend.username || "Jogador"}
                                        </p>
                                      </div>

                                      {friend.name && (
                                        <p className="text-[10px] text-slate-500 truncate">
                                          {friend.name}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {friend.username && (
                                      <Link
                                        href={href}
                                        className="text-[10px] text-sky-400 hover:text-sky-300"
                                      >
                                        Ver
                                      </Link>
                                    )}

                                    {/* ✅ Botão de DM */}
                                    <button
                                      type="button"
                                      title="Enviar mensagem"
                                      disabled={opening}
                                      onClick={() => openDmWithFriend(friend)}
                                      className="p-1.5 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-60"
                                    >
                                      {opening ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Send className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-800 my-1" />

                  {/* Solicitações recebidas */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIncomingExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-1">
                        <UserPlus className="w-3 h-3 text-yellow-300" />
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          Solicitações recebidas
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {incoming.length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {incoming.length} pendente(s)
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 transition-transform ${
                            incomingExpanded ? "" : "-rotate-90"
                          }`}
                        />
                      </div>
                    </button>

                    {incomingExpanded && (
                      <>
                        {incoming.length === 0 ? (
                          <p className="text-[11px] text-slate-500">
                            Nenhuma solicitação recebida no momento.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {incoming.map((req) => {
                              const u = req.fromUser;
                              const initials =
                                (u.username || u.name || "J")[0]?.toUpperCase() ??
                                "J";
                              const href = u.username ? `/u/${u.username}` : "#";

                              const createdAtText =
                                new Intl.DateTimeFormat("pt-BR", {
                                  dateStyle: "short",
                                }).format(new Date(req.createdAt));

                              const isAccepting =
                                responding?.id === req.id &&
                                responding.action === "ACCEPT";
                              const isDeclining =
                                responding?.id === req.id &&
                                responding.action === "DECLINE";

                              return (
                                <div
                                  key={req.id}
                                  className="rounded-md bg-slate-900/70 hover:bg-slate-900 px-2 py-1.5 border border-slate-800 space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      {u.avatarUrl ? (
                                        <img
                                          src={u.avatarUrl}
                                          alt={`Avatar de ${u.username}`}
                                          className="h-7 w-7 rounded-full object-cover border border-slate-700"
                                        />
                                      ) : (
                                        <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] text-slate-200 border border-slate-700">
                                          {initials}
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <p className="text-[11px] text-slate-100 truncate">
                                          {u.username || "Jogador"}
                                        </p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                          Pedido em {createdAtText}
                                        </p>
                                      </div>
                                    </div>

                                    {u.username && (
                                      <Link
                                        href={href}
                                        className="text-[10px] text-sky-400 hover:text-sky-300 flex-shrink-0"
                                      >
                                        Ver
                                      </Link>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      disabled={!!responding}
                                      onClick={() =>
                                        handleRespond(req.id, "ACCEPT")
                                      }
                                      className="px-2 py-1 rounded-md text-[10px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {isAccepting ? "Aceitando..." : "Aceitar"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!!responding}
                                      onClick={() =>
                                        handleRespond(req.id, "DECLINE")
                                      }
                                      className="px-2 py-1 rounded-md text-[10px] font-medium border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      {isDeclining ? "Recusando..." : "Recusar"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Solicitações enviadas */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setOutgoingExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <Send className="w-3 h-3 text-sky-300" />
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          Solicitações enviadas
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {outgoing.length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            {outgoing.length} aguardando
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3 h-3 text-slate-400 transition-transform ${
                            outgoingExpanded ? "" : "-rotate-90"
                          }`}
                        />
                      </div>
                    </button>

                    {outgoingExpanded && (
                      <>
                        {outgoing.length === 0 ? (
                          <p className="text-[11px] text-slate-500">
                            Você não enviou nenhuma solicitação recentemente.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {outgoing.map((req) => {
                              const u = req.toUser;
                              const initials =
                                (u.username || u.name || "J")[0]?.toUpperCase() ??
                                "J";

                              const createdAtText =
                                new Intl.DateTimeFormat("pt-BR", {
                                  dateStyle: "short",
                                }).format(new Date(req.createdAt));

                              return (
                                <div
                                  key={req.id}
                                  className="flex items-center justify-between gap-2 rounded-md bg-slate-900/60 px-2 py-1.5 border border-slate-800"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {u.avatarUrl ? (
                                      <img
                                        src={u.avatarUrl}
                                        alt={`Avatar de ${u.username}`}
                                        className="h-7 w-7 rounded-full object-cover border border-slate-700"
                                      />
                                    ) : (
                                      <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] text-slate-200 border border-slate-700">
                                        {initials}
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-[11px] text-slate-100 truncate">
                                        {u.username || "Jogador"}
                                      </p>
                                      <p className="text-[10px] text-slate-500 truncate">
                                        Enviado em {createdAtText}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Botão flutuante */}
      <button
        ref={toggleButtonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/40 w-11 h-11 flex items-center justify-center border border-sky-400/60"
        aria-label="Abrir menu de amigos"
      >
        {open ? <X className="w-4 h-4" /> : <Users className="w-4 h-4" />}
      </button>
    </>
  );
}
