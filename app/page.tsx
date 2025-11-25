import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { searchGames, type RawgGame } from "@/lib/rawg";
import { GameSlider } from "@/components/GameSlider";

const FEATURED_TITLES = [
  "Counter-Strike 2",
  "VALORANT",
  "World of Warcraft",
  "Dota 2",
  "League of Legends",
  "ARC Raiders",
  "Battlefield 6", 
];

export default async function HomePage() {
  const user = await getCurrentUser();

  const primaryCtaHref = user ? "/lobbies" : "/auth/register";
  const primaryCtaLabel = user ? "Encontrar lobby agora" : "Criar minha conta";
  const secondaryCtaHref = user
    ? "/u/" + (user.username ?? "")
    : "/auth/login";

  const displayName =
    user?.username || user?.name || user?.email?.split("@")[0] || null;

  // métricas e lobbies reais
  const [onlinePlayers, openLobbies, distinctGameRows, highlightedLobbies] =
    await prisma.$transaction([
      prisma.user.count({
        where: {
          status: {
            in: ["ONLINE", "AWAY", "BUSY"],
          },
        },
      }),
      prisma.lobby.count({
        where: { status: "OPEN" },
      }),
      prisma.lobby.findMany({
        where: { status: "OPEN" },
        distinct: ["gameId"],
        select: { gameId: true },
      }),
      prisma.lobby.findMany({
        where: { status: { in: ["OPEN", "FULL"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          game: true,
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          members: {
            where: { status: "ACTIVE" },
            select: { id: true },
          },
        },
      }),
    ]);

  const activeGames = distinctGameRows.length;

  // Jogos famosos, buscados pelo nome na RAWG
  let featuredGames: RawgGame[] = [];
  try {
    const results = await Promise.all(
      FEATURED_TITLES.map(async (title) => {
        const res = await searchGames(title, 1, 1); // 1º resultado
        const game = res.results?.[0];
        return game && game.background_image ? game : null;
      })
    );

    featuredGames = results.filter(
      (g): g is RawgGame => g !== null
    );
  } catch (e) {
    console.error("RAWG featured games error:", e);
    featuredGames = [];
  }

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="grid gap-8 md:grid-cols-[3fr,2fr] items-center">
        <div className="space-y-5">
          {displayName && (
            <p className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300 mb-1">
              👋 Bem-vindo de volta,{" "}
              <span className="ml-1 font-semibold text-sky-300">
                {displayName}
              </span>
            </p>
          )}

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-50">
            Encontre o{" "}
            <span className="text-sky-300">squad perfeito</span> para fechar a
            partida.
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-xl">
            O Ragnarok LFG conecta você com outros jogadores que querem jogar o
            mesmo jogo, no mesmo momento. Crie lobbies, veja quem está online,
            mande DM e nunca mais fique preso no “precisa de +1”.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button asChild size="sm" className="px-4 py-2 text-xs md:text-sm">
              <Link href={primaryCtaHref}>{primaryCtaLabel}</Link>
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-200 text-xs md:text-sm"
            >
              <Link href={secondaryCtaHref}>
                {user ? "Ver meu perfil público" : "Entrar com minha conta"}
              </Link>
            </Button>

            <span className="text-[11px] text-slate-500">
              💬 Chat privado, lista de amigos e status já funcionando.
            </span>
          </div>

          {/* métricas rápidas */}
          <div className="flex flex-wrap gap-4 pt-4 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{onlinePlayers} jogadores conectados agora</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>{openLobbies} lobbies abertos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>{activeGames} jogos ativos na comunidade</span>
            </div>
          </div>
        </div>

        {/* Lobbies em destaque */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-sky-500/10 blur-3xl" />
          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-sky-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-200">
                Lobbies em destaque
              </span>
              <Link
                href="/lobbies"
                className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] hover:border-sky-500 hover:text-sky-300"
              >
                Ver todos
              </Link>
            </div>

            <div className="space-y-2 text-[11px]">
              {highlightedLobbies.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-4 text-center text-slate-400 text-[11px]">
                  Nenhum lobby aberto no momento. Seja o primeiro a criar um!
                </div>
              )}

              {highlightedLobbies.map((lobby) => {
                const playersNow = lobby.members.length + 1; // inclui o dono
                const isOpen = lobby.status === "OPEN";
                const isFull = lobby.status === "FULL";

                let badgeLabel = "Aberto";
                let badgeClass =
                  "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";

                if (isFull) {
                  badgeLabel = "Cheio";
                  badgeClass =
                    "bg-yellow-500/10 text-yellow-300 border-yellow-500/40";
                }
                if (!isOpen && !isFull) {
                  badgeLabel = "Fechado";
                  badgeClass =
                    "bg-slate-800 text-slate-300 border-slate-600";
                }

                return (
                  <div
                    key={lobby.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-slate-100 text-xs font-medium truncate">
                        {lobby.game?.name ?? "Jogo desconhecido"} •{" "}
                        {lobby.title}
                      </p>
                      <p className="text-slate-400 text-[10px]">
                        {playersNow}/{lobby.maxPlayers} players{" "}
                        {lobby.language && `• ${lobby.language}`}{" "}
                        {lobby.region && `• ${lobby.region}`}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] border ${badgeClass}`}
                    >
                      {badgeLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 mt-3 text-[10px] text-slate-500">
              <p>
                Estes são lobbies reais criados pela comunidade. Use a página{" "}
                <Link
                  href="/lobbies"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Lobbies
                </Link>{" "}
                para filtrar por jogo, região e estilo de partida.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SLIDE DE JOGOS FAMOSOS (RAWG) */}
      {featuredGames.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">
                Jogos online que todo mundo conhece
              </h2>
              <p className="text-xs text-slate-400">
                Counter-Strike 2, VALORANT, LoL, Dota 2, WoW e mais — use esses
                títulos como referência na hora de criar seus lobbies.
              </p>
            </div>
          </div>

          <GameSlider games={featuredGames} />
        </section>
      )}

      {/* FEATURES principais */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-50">
          Feito para quem realmente joga em equipe
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          O foco aqui é simples: ajudar você a achar gente pra jogar, organizar
          o squad e manter por perto quem joga bem com você.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Lobbies */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lobbies em segundos</CardTitle>
              <CardDescription className="text-xs">
                Crie um lobby dizendo qual jogo, modo e quantas pessoas faltam.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-400 space-y-1">
              <p>• Defina jogo, descrição, idioma, região e número de vagas.</p>
              <p>• Entre em lobbies abertos ou feche o squad com um clique.</p>
              <p>• Status do lobby (aberto / cheio / fechado) sempre visível.</p>
            </CardContent>
          </Card>

          {/* Amigos + DM */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Amigos e DM</CardTitle>
              <CardDescription className="text-xs">
                Transforme bons teammates em amigos fixos e mantenha contato
                direto com eles.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-400 space-y-1">
              <p>• Envie e aceite pedidos de amizade entre jogadores.</p>
              <p>• Lista de amigos com status em tempo real.</p>
              <p>• Chat privado entre dois jogadores, direto do perfil.</p>
            </CardContent>
          </Card>

          {/* Perfil & Presença */}
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Perfil gamer & presença
              </CardTitle>
              <CardDescription className="text-xs">
                Mostre quem você é como jogador e deixe claro quando está
                disponível pra jogar.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-400 space-y-1">
              <p>• Perfil público com avatar, nome de usuário e bio.</p>
              <p>• Status configurável: online, ocupado, ausente, invisível.</p>
              <p>• Botão de enviar mensagem direto do perfil dos amigos.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-50">
          Como funciona na prática?
        </h2>

        <div className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <span className="h-5 w-5 rounded-full border border-sky-500 flex items-center justify-center text-[11px]">
                1
              </span>
              <span>Crie sua conta</span>
            </div>
            <p className="text-slate-400 text-xs">
              Leva menos de 1 minuto. Escolha um nome de usuário, configure seu
              avatar e personalize sua bio de jogador.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <span className="h-5 w-5 rounded-full border border-sky-500 flex items-center justify-center text-[11px]">
                2
              </span>
              <span>Entre ou crie um lobby</span>
            </div>
            <p className="text-slate-400 text-xs">
              Use a página de lobbies para encontrar uma sala pronta ou criar a
              sua, indicando quantos jogadores ainda faltam para fechar o time.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <span className="h-5 w-5 rounded-full border border-sky-500 flex items-center justify-center text-[11px]">
                3
              </span>
              <span>Jogue com a galera certa</span>
            </div>
            <p className="text-slate-400 text-xs">
              Adicione quem se deu bem com você, chame pela DM, veja quem está
              online e parta direto pro jogo com o squad montado.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
