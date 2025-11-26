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
import { GameSearchInput } from "@/components/lobbies/GameSearchInput";

/* SERVER ACTIONS ===================================================== */
async function createLobbyAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) {
    redirect("/auth/login");
  }

  const gameId = String(formData.get("gameId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const maxPlayersRaw = formData.get("maxPlayers");
  const language = String(formData.get("language") || "").trim();
  const region = String(formData.get("region") || "").trim();

  const maxPlayers = Number(maxPlayersRaw);

  if (!gameId) {
    throw new Error("Selecione um jogo para o lobby.");
  }
  if (!title) {
    throw new Error("Informe um título para o lobby.");
  }
  if (!maxPlayers || Number.isNaN(maxPlayers) || maxPlayers < 2 || maxPlayers > 16) {
    throw new Error("O número de vagas deve ser entre 2 e 16.");
  }

  const lobbyId = await prisma.$transaction(async (tx) => {
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

    await tx.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: user.id,
        role: MemberRole.LEADER,
        status: MemberStatus.ACTIVE,
      },
    });

    return lobby.id;
  });

  // atualiza lista de lobbies e vai direto pra página do lobby
  revalidatePath("/lobbies");
  redirect(`/lobbies/${lobbyId}`);
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
          select: { userId: true },
        },
      },
    });

    if (!lobby) {
      throw new Error("Lobby não encontrado.");
    }

    if (lobby.status === LobbyStatus.CLOSED) {
      throw new Error("Este lobby está fechado.");
    }

    const alreadyMember = lobby.members.some(
      (m) => m.userId === user.id
    );
    if (alreadyMember) {
      return;
    }

    const currentCount = lobby.members.length;
    if (currentCount >= lobby.maxPlayers) {
      throw new Error("Este lobby já está cheio.");
    }

    await tx.lobbyMember.create({
      data: {
        lobbyId,
        userId: user.id,
        role: MemberRole.MEMBER,
        status: MemberStatus.ACTIVE,
      },
    });

    const newCount = currentCount + 1;
    if (newCount >= lobby.maxPlayers && lobby.status !== LobbyStatus.FULL) {
      await tx.lobby.update({
        where: { id: lobbyId },
        data: { status: LobbyStatus.FULL },
      });
    }
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

    const activeCount = await tx.lobbyMember.count({
      where: {
        lobbyId,
        status: MemberStatus.ACTIVE,
      },
    });

    if (activeCount === 0) {
      await tx.lobby.update({
        where: { id: lobbyId },
        data: { status: LobbyStatus.CLOSED },
      });
      return;
    }

    const lobby = await tx.lobby.findUnique({
      where: { id: lobbyId },
      select: { maxPlayers: true, status: true },
    });

    if (
      lobby &&
      lobby.status === LobbyStatus.FULL &&
      activeCount < lobby.maxPlayers
    ) {
      await tx.lobby.update({
        where: { id: lobbyId },
        data: { status: LobbyStatus.OPEN },
      });
    }
  });

  revalidatePath("/lobbies");
  // depois de sair, volta pra listagem
  redirect("/lobbies");
}

/* PAGE =============================================================== */

export default async function LobbiesPage() {
  const user = await getCurrentUser();

  const [lobbies, games] = await Promise.all([
    prisma.lobby.findMany({
      where: {
        status: {
          in: [LobbyStatus.OPEN, LobbyStatus.FULL],
        },
      },
      include: {
        game: true,
        owner: true,
        members: {
          where: { status: MemberStatus.ACTIVE },
          select: {
            userId: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
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
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Lobbies disponíveis
        </h1>
        <p className="text-sm text-slate-400">
          Crie salas para encontrar squad ou entre em lobbies que já estão
          procurando jogadores. Tudo integrado com seu perfil e lista de amigos.
        </p>
      </header>

      {/* CRIAR LOBBY */}
      {user ? (
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Criar novo lobby</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Busque o jogo usando a RAWG ou escolha um dos últimos que você
              usou. Depois é só definir vagas e descrição da sala.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form action={createLobbyAction} className="space-y-4">
              {/* linha 1: jogo (busca RAWG + recentes) */}
              <GameSearchInput
                initialGames={games.map((g) => ({
                  id: g.id,
                  name: g.name,
                  platform: g.platform,
                  backgroundImageUrl: g.backgroundImageUrl,
                }))}
              />

              {/* linha 2: título */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300">
                  Título do lobby
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  maxLength={80}
                  placeholder="Ex: Ranked tryhard, chill, treinamento, só duo..."
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                />
              </div>

              {/* linha 3: vagas / idioma / região */}
              <div className="grid gap-2 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">
                    Vagas (máx. 16)
                  </label>
                  <input
                    name="maxPlayers"
                    type="number"
                    min={2}
                    max={16}
                    defaultValue={5}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">
                    Idioma
                  </label>
                  <input
                    name="language"
                    type="text"
                    placeholder="Ex: pt-BR, en..."
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
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
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                  />
                </div>
              </div>

              {/* linha 4: descrição + botão */}
              <div className="grid gap-3 md:grid-cols-[3fr,auto] items-end">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300">
                    Descrição (opcional)
                  </label>
                  <textarea
                    name="description"
                    rows={2}
                    maxLength={200}
                    placeholder="Ex: Precisa ter micro, saber call, elo mínimo, horário até 00h..."
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                  />
                </div>

                <div className="md:justify-self-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full md:w-auto text-xs px-4"
                  >
                    Criar lobby
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3">
          <p className="text-xs text-slate-400">
            Faça login para criar lobbies e entrar em salas com outros
            jogadores.
          </p>
          <Button asChild size="sm" className="text-xs px-4">
            <Link href="/auth/login">Entrar</Link>
          </Button>
        </div>
      )}

      {/* RESUMO */}
      <div className="flex justify-between items-center gap-2">
        <p className="text-xs text-slate-500">
          {lobbies.length === 0
            ? "Nenhum lobby aberto no momento."
            : `${lobbies.length} lobby(s) aberto(s).`}
        </p>
      </div>

      {/* LISTA DE LOBBIES */}
      {lobbies.length === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-700 rounded-lg px-4 py-6">
          Ainda não há lobbies cadastrados. Crie o primeiro e chame a galera
          para jogar.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lobbies.map((lobby) => {
            const currentPlayers = lobby.members.length;
            const isFull =
              currentPlayers >= lobby.maxPlayers ||
              lobby.status === LobbyStatus.FULL;

            const isMember = meId
              ? lobby.members.some((m) => m.userId === meId)
              : false;

            const isLeader = meId && lobby.owner.id === meId;

            return (
              <Card
                key={lobby.id}
                className="border-slate-800 bg-slate-900/80 hover:border-sky-600/70 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm flex flex-col gap-0.5">
                        <span>{lobby.title}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {lobby.game.name} • {lobby.game.platform}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {lobby.description || "Sem descrição."}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full border ${
                          isFull
                            ? "border-red-500/50 text-red-300 bg-red-900/20"
                            : "border-emerald-500/50 text-emerald-300 bg-emerald-900/10"
                        }`}
                      >
                        {isFull ? "FULL" : "OPEN"} • {currentPlayers}/
                        {lobby.maxPlayers}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Líder:{" "}
                        {lobby.owner.username ||
                          lobby.owner.name ||
                          "Jogador"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 text-[11px] text-slate-400 space-y-2">
                  <p>
                    Idioma:{" "}
                    <span className="text-slate-200">
                      {lobby.language || "Não informado"}
                    </span>
                  </p>
                  <p>
                    Região:{" "}
                    <span className="text-slate-200">
                      {lobby.region || "Global"}
                    </span>
                  </p>

                  {meId && isMember && (
                    <p className="text-sky-300">
                      {isLeader
                        ? "Você é o líder deste lobby."
                        : "Você já faz parte deste lobby."}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-slate-500">
                      ID:{" "}
                      <span className="font-mono text-[10px]">
                        {lobby.id}
                      </span>
                    </p>

                    {meId ? (
                      isMember ? (
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
                            className="h-7 px-2 text-[11px]"
                          >
                            Sair do lobby
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
                            className="h-7 px-2 text-[11px]"
                            disabled={isFull}
                          >
                            {isFull ? "Lobby cheio" : "Entrar no lobby"}
                          </Button>
                        </form>
                      )
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        asChild
                      >
                        <Link href="/auth/login">
                          Entrar para participar
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
