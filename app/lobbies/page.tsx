import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

import {
  LobbyStatus,
  MemberRole,
  MemberStatus,
} from "@prisma/client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/* -------------------------------------------------------------------------- */
/*                               SERVER ACTIONS                               */
/* -------------------------------------------------------------------------- */

async function createLobbyAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  const gameId = String(formData.get("gameId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const language = String(formData.get("language") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const maxPlayersRaw = formData.get("maxPlayers");

  const maxPlayers = Number(maxPlayersRaw);

  // Validações simples (o HTML já ajuda com required, min, max)
  if (!gameId) {
    throw new Error("Selecione um jogo para o lobby.");
  }

  if (!title) {
    throw new Error("Informe um título para o lobby.");
  }

  if (
    !maxPlayers ||
    Number.isNaN(maxPlayers) ||
    maxPlayers < 2 ||
    maxPlayers > 16
  ) {
    throw new Error("O número de vagas deve ser entre 2 e 16.");
  }

  let newLobbyId = "";

  await prisma.$transaction(async (tx) => {
    const lobby = await tx.lobby.create({
      data: {
        title,
        description: description || null,
        maxPlayers,
        status: LobbyStatus.OPEN,
        gameId,
        ownerId: user.id,
        language: language || null,
        region: region || null,
      },
    });

    newLobbyId = lobby.id;

    // já entra como líder do lobby
    await tx.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: user.id,
        role: MemberRole.LEADER,
        status: MemberStatus.ACTIVE,
      },
    });
  });

  // atualiza listagem em /lobbies
  revalidatePath("/lobbies");

  // redireciona para a página de detalhe do lobby
  redirect(`/lobbies/${newLobbyId}`);
}

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

  // Opcional: você pode transformar isso numa transação com checagem de maxPlayers
  await prisma.lobbyMember.upsert({
    where: {
      lobbyId_userId: {
        lobbyId,
        userId: user.id,
      },
    },
    update: {
      status: MemberStatus.ACTIVE,
      role: MemberRole.MEMBER,
    },
    create: {
      lobbyId,
      userId: user.id,
      status: MemberStatus.ACTIVE,
      role: MemberRole.MEMBER,
    },
  });

  revalidatePath("/lobbies");
  redirect(`/lobbies/${lobbyId}`);
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

  // Marca como LEFT (em vez de apagar) pra manter histórico
  await prisma.lobbyMember.updateMany({
    where: {
      lobbyId,
      userId: user.id,
      status: MemberStatus.ACTIVE,
    },
    data: {
      status: MemberStatus.LEFT,
    },
  });

  revalidatePath("/lobbies");
  redirect("/lobbies");
}

/* -------------------------------------------------------------------------- */
/*                                 PAGE (SSR)                                 */
/* -------------------------------------------------------------------------- */

export default async function LobbiesPage() {
  const [user, lobbies, games] = await Promise.all([
    getCurrentUser(),
    prisma.lobby.findMany({
      where: {
        status: {
          in: [LobbyStatus.OPEN, LobbyStatus.FULL],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
          where: {
            status: MemberStatus.ACTIVE,
          },
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            members: {
              where: {
                status: MemberStatus.ACTIVE,
              },
            },
          },
        },
      },
    }),
    prisma.game.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const meId = user?.id ?? null;

  return (
    <div className="space-y-6">
      {/* topo */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          LFG & Lobbies
        </h1>
        <p className="text-sm text-slate-400">
          Crie salas para encontrar jogadores ou entre em um lobby já criado.
        </p>
      </header>

      {/* criação de lobby */}
      {meId && (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base">Criar novo lobby</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Escolha o jogo, defina um título e configure os detalhes da sua
              sala.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={createLobbyAction}
              className="grid gap-4 md:grid-cols-2"
            >
              {/* Jogo */}
              <div className="space-y-1">
                <Label htmlFor="gameId">Jogo</Label>
                <Select name="gameId">
                  <SelectTrigger id="gameId">
                    <SelectValue placeholder="Selecione um jogo" />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((game) => (
                      <SelectItem key={game.id} value={game.id}>
                        {game.name}{" "}
                        {game.platform ? `• ${game.platform}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  Lista baseada nos últimos jogos que você cadastrou/integrar.
                </p>
              </div>

              {/* Título */}
              <div className="space-y-1">
                <Label htmlFor="title">Título do lobby</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Ex: Partida ranqueada, só players BR"
                  required
                />
              </div>

              {/* Máximo de players */}
              <div className="space-y-1">
                <Label htmlFor="maxPlayers">Máx. de jogadores</Label>
                <Input
                  id="maxPlayers"
                  name="maxPlayers"
                  type="number"
                  min={2}
                  max={16}
                  defaultValue={5}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Entre 2 e 16 jogadores.
                </p>
              </div>

              {/* Idioma */}
              <div className="space-y-1">
                <Label htmlFor="language">Idioma</Label>
                <Input
                  id="language"
                  name="language"
                  placeholder="Ex: pt-BR, en, es..."
                />
              </div>

              {/* Região */}
              <div className="space-y-1">
                <Label htmlFor="region">Região</Label>
                <Input
                  id="region"
                  name="region"
                  placeholder="Ex: BR, NA, EU..."
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Explique as regras, modo de jogo, rank mínimo, etc."
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" size="sm">
                  Criar lobby
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* listagem de lobbys */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-base">Lobbies disponíveis</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Veja quem está procurando grupo agora e entre em uma sala.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lobbies.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhum lobby aberto no momento. Que tal criar o primeiro?
            </p>
          ) : (
            <div className="space-y-3">
              {lobbies.map((lobby) => {
                const currentPlayers = lobby.members.length;
                const isFull =
                  currentPlayers >= lobby.maxPlayers ||
                  lobby.status === LobbyStatus.FULL;

                const isInLobby = lobby.members.some(
                  (m) => m.userId === meId && m.status === MemberStatus.ACTIVE,
                );

                const isLeader = lobby.ownerId === meId;

                return (
                  <Card
                    key={lobby.id}
                    className="border-slate-800/80 bg-slate-950/70"
                  >
                    <CardContent className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold">
                            {lobby.title}
                          </h2>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border ${isFull
                              ? "border-red-500/50 text-red-300 bg-red-900/20"
                              : "border-emerald-500/50 text-emerald-300 bg-emerald-900/10"
                              }`}
                          >
                            {lobby.status} • {currentPlayers}/
                            {lobby.maxPlayers}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {lobby.game.name} • {lobby.game.platform} • host:{" "}
                          {lobby.owner?.username ||
                            lobby.owner?.name ||
                            "Jogador"}
                        </p>
                        {lobby.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {lobby.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">
                            Jogadores: {currentPlayers}/{lobby.maxPlayers}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/lobbies/${lobby.id}`}>
                              Ver lobby
                            </Link>
                          </Button>

                          {meId && (
                            <>
                              {isInLobby ? (
                                <form action={leaveLobbyAction}>
                                  <input
                                    type="hidden"
                                    name="lobbyId"
                                    value={lobby.id}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                    className="text-xs text-slate-300"
                                  >
                                    Sair
                                  </Button>
                                </form>
                              ) : (
                                <form action={joinLobbyAction}>
                                  <input
                                    type="hidden"
                                    name="lobbyId"
                                    value={lobby.id}
                                  />
                                  <Button
                                    type="submit"
                                    size="sm"
                                    disabled={isFull}
                                  >
                                    {isFull
                                      ? "Lobby cheio"
                                      : "Entrar no lobby"}
                                  </Button>
                                </form>
                              )}
                            </>
                          )}
                        </div>

                        {isLeader && (
                          <span className="text-[10px] text-sky-400">
                            Você é o líder deste lobby.
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
