import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeText, sanitizeURL } from "@/lib/sanitize";
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
import { GameSearchInput } from "@/components/lobbies/GameSearchInput";

/* ========================================================================== */
/*                               SERVER ACTIONS                               */
/* ========================================================================== */

async function createLobbyAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  // Campos comuns do form
  const gameIdFromForm = String(formData.get("gameId") || "").trim();
  const title = sanitizeText(String(formData.get("title") || ""));
  const description = sanitizeText(String(formData.get("description") || ""));
  const maxPlayersRaw = formData.get("maxPlayers");
  const language = sanitizeText(String(formData.get("language") || ""));
  const region = sanitizeText(String(formData.get("region") || ""));

  // Campos vindos do GameSearchInput (RAWG)
  const rawgIdStr = String(formData.get("rawgId") || "").trim();

  // >>> aqui usamos exatamente os names do GameSearchInput:
  const rawgName = sanitizeText(
    String(
    formData.get("rawgName") || formData.get("gameName") || ""
    )
  );
  const rawgPlatform = sanitizeText(
    String(
    formData.get("rawgPlatform") || formData.get("gamePlatform") || ""
    )
  );
  const rawgBgImage = sanitizeURL(
    String(
      formData.get("rawgImage") ||
      formData.get("gameBackgroundImageUrl") ||
      ""
    )
  );

  const maxPlayers = Number(maxPlayersRaw);

  if (!title) {
    throw new Error("Defina um título para o lobby.");
  }
  if (!maxPlayers || Number.isNaN(maxPlayers) || maxPlayers <= 0) {
    throw new Error("Número de jogadores inválido.");
  }

  // ----------------------------------------------------------------------------
  // Garantir que temos um gameId:
  // - se veio direto (jogo já existente no banco), usamos ele
  // - se não veio, mas temos rawgId => criamos/atualizamos Game por rawgId
  // ----------------------------------------------------------------------------
  let gameId = gameIdFromForm;

  if (!gameId && rawgIdStr) {
    const rawgIdNum = Number(rawgIdStr);
    if (!rawgIdNum || Number.isNaN(rawgIdNum)) {
      throw new Error("Jogo inválido (RAWG ID incorreto).");
    }

    // gera um slug simples a partir do nome, se existir
    const slugFromName =
      rawgName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `rawg-${rawgIdNum}`;

    const game = await prisma.game.upsert({
      where: { rawgId: rawgIdNum },
      update: {
        name: rawgName || undefined,
        slug: slugFromName || undefined,
        platform: rawgPlatform || undefined,
        backgroundImageUrl: rawgBgImage || undefined,
      },
      create: {
        name: rawgName || "Jogo desconhecido",
        slug: slugFromName,
        platform: rawgPlatform || "Multi",
        rawgId: rawgIdNum,
        backgroundImageUrl: rawgBgImage || null,
      },
    });

    gameId = game.id;
  }

  if (!gameId) {
    throw new Error("Selecione um jogo para o lobby.");
  }

  // ----------------------------------------------------------------------------
  // Criação do lobby + membro líder
  // ----------------------------------------------------------------------------
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

    await tx.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: user.id,
        role: MemberRole.LEADER,
        status: MemberStatus.ACTIVE,
      },
    });
  });

  revalidatePath("/lobbies");
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

  await prisma.$transaction(async (tx) => {
    const lobby = await tx.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: {
          where: { status: MemberStatus.ACTIVE },
        },
      },
    });

    if (!lobby) {
      throw new Error("Lobby não encontrado.");
    }

    const existing = await tx.lobbyMember.findFirst({
      where: {
        lobbyId,
        userId: user.id,
      },
    });

    if (existing) {
      // se já existe, reativa
      await tx.lobbyMember.update({
        where: { id: existing.id },
        data: { status: MemberStatus.ACTIVE },
      });
    } else {
      if (lobby.members.length >= lobby.maxPlayers) {
        throw new Error("Lobby cheio.");
      }

      await tx.lobbyMember.create({
        data: {
          lobbyId,
          userId: user.id,
          status: MemberStatus.ACTIVE,
          role: MemberRole.MEMBER,
        },
      });
    }

    const activeCount = await tx.lobbyMember.count({
      where: { lobbyId, status: MemberStatus.ACTIVE },
    });

    await tx.lobby.update({
      where: { id: lobbyId },
      data: {
        status:
          activeCount >= lobby.maxPlayers
            ? LobbyStatus.FULL
            : LobbyStatus.OPEN,
      },
    });
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

  await prisma.$transaction(async (tx) => {
    const member = await tx.lobbyMember.findFirst({
      where: {
        lobbyId,
        userId: user.id,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!member) {
      return;
    }

    await tx.lobbyMember.update({
      where: { id: member.id },
      data: { status: MemberStatus.LEFT },
    });

    const lobby = await tx.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: {
          where: { status: MemberStatus.ACTIVE },
        },
      },
    });

    if (!lobby) return;

    await tx.lobby.update({
      where: { id: lobbyId },
      data: {
        status:
          lobby.members.length === 0
            ? LobbyStatus.CLOSED
            : LobbyStatus.OPEN,
      },
    });
  });

  revalidatePath("/lobbies");
  redirect("/lobbies");
}

/* ========================================================================== */
/*                                   PAGE                                     */
/* ========================================================================== */

export default async function LobbiesPage() {
  const [user, lobbies, games] = await Promise.all([
    getCurrentUser(),
    prisma.lobby.findMany({
      where: {
        status: {
          in: [LobbyStatus.OPEN, LobbyStatus.FULL],
        },
      },
      orderBy: { createdAt: "desc" },
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
          include: { user: true },
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
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      {/* topo */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          LFG &amp; Lobbies
        </h1>
        <p className="text-sm text-slate-400">
          Crie salas para encontrar jogadores ou entre em um lobby já criado.
        </p>
      </div>

      {/* criação de lobby */}
      {meId && (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base">Criar novo lobby</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Defina jogo, vagas e descrição da sala.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form action={createLobbyAction} className="space-y-4">
              {/* jogo (GameSearchInput cuida do hidden gameId) */}
              <GameSearchInput
                initialGames={games.map((g) => ({
                  id: g.id,
                  name: g.name,
                  platform: g.platform,
                  backgroundImageUrl: g.backgroundImageUrl,
                }))}
              />

              {/* título */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Título do lobby
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Ex: Ranked tryhard, chill, treinamento..."
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* max players */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Máximo de jogadores
                </label>
                <input
                  name="maxPlayers"
                  type="number"
                  min={2}
                  max={16}
                  defaultValue={5}
                  required
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <p className="text-[10px] text-slate-500">
                  Entre 2 e 16 jogadores.
                </p>
              </div>

              {/* idioma & região */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">
                    Idioma
                  </label>
                  <input
                    name="language"
                    type="text"
                    placeholder="Ex: pt-BR, en, es..."
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">
                    Região
                  </label>
                  <input
                    name="region"
                    type="text"
                    placeholder="Ex: BR, NA, EU..."
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* descrição */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Descrição
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Explique regras, modo de jogo, rank mínimo, etc."
                  className="w-full resize-none rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Criar lobby
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* lista de lobbies */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader>
          <CardTitle className="text-base">Lobbies disponíveis</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Veja quem está procurando grupo agora.
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

                const isInLobby = meId
                  ? lobby.members.some(
                    (m) =>
                      m.userId === meId &&
                      m.status === MemberStatus.ACTIVE,
                  )
                  : false;

                const isLeader = meId === lobby.ownerId;

                return (
                  <Card
                    key={lobby.id}
                    className="border-slate-800/80 bg-slate-950/70"
                  >
                    <CardContent className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold text-slate-100">
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
                        {isLeader && (
                          <p className="text-[10px] text-sky-400">
                            Você é o líder deste lobby.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="text-xs"
                          >
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
                                    className="text-xs"
                                    disabled={isFull}
                                  >
                                    {isFull
                                      ? "Lobby cheio"
                                      : "Entrar para participar"}
                                  </Button>
                                </form>
                              )}
                            </>
                          )}
                        </div>
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
