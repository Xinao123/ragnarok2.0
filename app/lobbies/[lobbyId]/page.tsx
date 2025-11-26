// app/lobbies/[lobbyId]/page.tsx
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { joinLobby, leaveLobby } from "@/lib/lobbies";
import { LobbyStatus, MemberStatus, MemberRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/* SERVER ACTIONS ---------------------------------------------------- */

async function joinLobbyAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  const lobbyId = String(formData.get("lobbyId") || "").trim();
  if (!lobbyId) {
    throw new Error("Lobby inválido.");
  }

  await joinLobby(lobbyId, user.id);

  revalidatePath("/lobbies");
  revalidatePath(`/lobbies/${lobbyId}`);
}

async function leaveLobbyAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  const lobbyId = String(formData.get("lobbyId") || "").trim();
  if (!lobbyId) {
    throw new Error("Lobby inválido.");
  }

  await leaveLobby(lobbyId, user.id);

  revalidatePath("/lobbies");
  revalidatePath(`/lobbies/${lobbyId}`);
}

/* PAGE -------------------------------------------------------------- */

type PageProps = {
  params: { lobbyId: string };
};

export default async function LobbyDetailPage({ params }: PageProps) {
  const { lobbyId } = params;

  const [user, lobby] = await Promise.all([
    getCurrentUser(),
    prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        game: true,
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
          where: { status: MemberStatus.ACTIVE },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!lobby) {
    notFound();
  }

  const meId = user?.id ?? null;
  const isMember = meId
    ? lobby.members.some((m) => m.userId === meId)
    : false;

  const isLeader = meId && lobby.ownerId === meId;

  const currentPlayers = lobby.members.length;
  const isFull =
    currentPlayers >= lobby.maxPlayers ||
    lobby.status === LobbyStatus.FULL;

  return (
    <div className="space-y-6">
      {/* topo / breadcrumb */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            <Link
              href="/lobbies"
              className="text-sky-400 hover:text-sky-300"
            >
              ← Voltar para lobbys
            </Link>
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {lobby.title}
          </h1>
          <p className="text-xs text-slate-400">
            {lobby.game.name} • {lobby.game.platform} •{" "}
            {lobby.language || "Idioma não informado"} •{" "}
            {lobby.region || "Região global"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              isFull
                ? "border-red-500/50 text-red-300 bg-red-900/20"
                : "border-emerald-500/50 text-emerald-300 bg-emerald-900/10"
            }`}
          >
            {lobby.status} • {currentPlayers}/{lobby.maxPlayers}
          </span>
          <p className="text-[11px] text-slate-500">
            Líder:{" "}
            <Link
              href={`/user/${lobby.owner.username || lobby.owner.id}`}
              className="text-sky-400 hover:text-sky-300"
            >
              {lobby.owner.username ||
                lobby.owner.name ||
                "Jogador"}
            </Link>
          </p>
        </div>
      </div>

      {/* descrição + ações */}
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-sm font-medium text-slate-100">
            Sobre este lobby
          </h2>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">
            {lobby.description || "O líder não adicionou uma descrição."}
          </p>
          <p className="text-[11px] text-slate-500">
            Criado em{" "}
            {new Date(lobby.createdAt).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <h2 className="text-sm font-medium text-slate-100">
            Participar
          </h2>

          {meId ? (
            isMember ? (
              <div className="space-y-2">
                <p className="text-xs text-emerald-300">
                  Você já está neste lobby{" "}
                  {isLeader && "(e é o líder)"}.
                </p>
                <form action={leaveLobbyAction}>
                  <input
                    type="hidden"
                    name="lobbyId"
                    value={lobby.id}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                  >
                    Sair do lobby
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-300">
                  Clique abaixo para entrar na sala. O líder pode
                  organizar call, regras e posição do time.
                </p>
                <form action={joinLobbyAction}>
                  <input
                    type="hidden"
                    name="lobbyId"
                    value={lobby.id}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full text-xs"
                    disabled={isFull}
                  >
                    {isFull ? "Lobby cheio" : "Entrar no lobby"}
                  </Button>
                </form>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-300">
                Faça login para entrar neste lobby.
              </p>
              <Button asChild size="sm" className="w-full text-xs">
                <Link href="/auth/login">Entrar / cadastrar</Link>
              </Button>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Em breve: chat do lobby, convite rápido de amigos e
            preferências salvas por jogo. 😉
          </p>
        </div>
      </div>

      {/* membros */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <h2 className="text-sm font-medium text-slate-100">
          Membros ({currentPlayers}/{lobby.maxPlayers})
        </h2>

        {lobby.members.length === 0 ? (
          <p className="text-xs text-slate-400">
            Ainda não há ninguém na sala além do líder.
          </p>
        ) : (
          <ul className="space-y-2">
            {lobby.members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/70 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* avatar simples, se quiser pode trocar por componente Avatar */}
                  <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-[11px] text-slate-300 overflow-hidden">
                    {m.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user.avatarUrl}
                        alt={m.user.username || m.user.name || "Jogador"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (m.user.username || m.user.name || "?")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-100 truncate">
                      {m.user.username ||
                        m.user.name ||
                        "Jogador sem nick"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {m.role === MemberRole.LEADER
                        ? "Líder"
                        : "Membro"}
                    </p>
                  </div>
                </div>
                {meId === m.userId && (
                  <span className="text-[10px] text-emerald-300">
                    Você
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
