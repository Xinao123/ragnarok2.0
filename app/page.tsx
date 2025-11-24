import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function HomePage() {
  const user = await getCurrentUser();

  const primaryCtaHref = user ? "/lobbies" : "/auth/register";
  const primaryCtaLabel = user ? "Encontrar lobby agora" : "Criar minha conta";
  const secondaryCtaHref = user ? "/u/" + (user.username ?? "") : "/auth/login";

  const displayName =
    user?.username || user?.name || user?.email?.split("@")[0] || null;

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
            <span className="text-sky-300">time perfeito</span> para jogar em
            poucos segundos.
          </h1>

          <p className="text-sm md:text-base text-slate-400 max-w-xl">
            O Ragnarok LFG conecta você com outros jogadores que buscam a mesma
            partida, no mesmo jogo e no mesmo estilo. Crie lobbies, organize
            squads e nunca mais jogue solo sem querer.
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
              💬 Em breve: chat em tempo real e status online.
            </span>
          </div>

          <div className="flex flex-wrap gap-6 pt-4 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Sem anúncios</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span>Focado em jogadores de squad</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span>Interface leve e responsiva</span>
            </div>
          </div>
        </div>

        {/* Bloco visual à direita */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-sky-500/10 blur-3xl" />
          <div className="relative rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-sky-900/40 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-200">
                Lobbies em destaque
              </span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px]">
                Preview
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-slate-100 text-xs font-medium">
                    Valorant • Rank up
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    3/5 players • Com call
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/40">
                  Aberto
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-slate-100 text-xs font-medium">
                    CS2 • Mirage only
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    4/5 players • Casual tryhard
                  </p>
                </div>
                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-300 border border-yellow-500/40">
                  Quase cheio
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-slate-100 text-xs font-medium">
                    LoL • Flex noite
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    5/5 players • Full
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 border border-slate-600">
                  Fechado
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 mt-3 text-[10px] text-slate-500">
              <p>
                Os dados acima são apenas ilustração da interface. Para ver
                lobbies reais, acesse a página{" "}
                <Link
                  href="/lobbies"
                  className="text-sky-400 hover:text-sky-300"
                >
                  Lobbies
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-50">
          Pensado para quem joga em equipe
        </h2>
        <p className="text-sm text-slate-400 max-w-2xl">
          O Ragnarok foi desenhado para facilitar a vida de quem sempre precisa
          de mais alguém para fechar o squad. Simples, direto ao ponto e sem
          frescura.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lobbies em segundos</CardTitle>
              <CardDescription className="text-xs">
                Crie um lobby dizendo qual jogo, modo e quantas pessoas faltam.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-400 space-y-1">
              <p>• Defina jogo, descrição e número de vagas.</p>
              <p>• Compartilhe o link com amigos ou deixe público.</p>
              <p>• Em breve: tags de estilo (casual, competitivo, treino).</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Perfil de jogador</CardTitle>
              <CardDescription className="text-xs">
                Mostre quem você é, o que joga e como gosta de jogar.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-400 space-y-1">
              <p>• Foto de perfil e bio personalizada.</p>
              <p>• Histórico de lobbies criados e que participou.</p>
              <p>• Link público: compartilhe seu perfil com a galera.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Seguro e organizado</CardTitle>
              <CardDescription className="text-xs">
                Autenticação moderna, sessão segura e dados estruturados.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-[11px] text-slate-400 space-y-1">
              <p>• Login com usuário e senha usando Auth.js.</p>
              <p>• Banco de dados PostgreSQL com Prisma.</p>
              <p>• Avatares armazenados com MinIO (S3-like).</p>
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
              Leva menos de 1 minuto. Escolha um nome de usuário, coloque seu
              e-mail e configure seu perfil com foto e bio.
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
              Use a página de lobbies para procurar uma sala pronta ou crie a
              sua, indicando quantos jogadores ainda faltam.
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
              Em breve, chat em tempo real e status online para combinar call,
              horário e estilo de jogo direto pelo Ragnarok.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
