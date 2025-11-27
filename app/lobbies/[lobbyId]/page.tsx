// app/lobbies/[lobbyId]/page.tsx
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Record<string, string | string[]>;
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstString(value: string | string[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

// Resolve o ID do lobby a partir de searchParams OU params da rota
function resolveLobbyId(
  params: Record<string, string | string[]>,
  searchParams?: Record<string, string | string[] | undefined>
): string | null {
  // 1) tenta pegar da query (?lobbyId=xxx ou ?id=xxx)
  const fromQuery =
    firstString(searchParams?.lobbyId) ?? firstString(searchParams?.id);

  if (fromQuery) return fromQuery;

  // 2) pega o primeiro param dinâmico da rota (/lobbies/[qualquerCoisa])
  const keys = Object.keys(params);
  if (keys.length === 0) return null;

  const key = keys[0];
  return firstString(params[key]);
}

export default async function LobbyDetailPage({ params, searchParams }: PageProps) {
  const lobbyId = resolveLobbyId(params, searchParams);

  // Se não conseguimos resolver um ID, nem chamamos o Prisma
  if (!lobbyId) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Lobby inválido</h1>
        <p className="text-sm text-slate-400">
          O identificador deste lobby não é válido.
        </p>

        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-1">Debug params/searchParams:</p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify({ params, searchParams }, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        game: true,
        owner: true,
        members: {
          include: { user: true },
        },
      },
    });

    if (!lobby) {
      return (
        <div className="p-6 space-y-3">
          <h1 className="text-xl font-semibold">Lobby não encontrado</h1>
          <p className="text-sm text-slate-400">
            Não encontrei nenhum lobby com o ID:
          </p>
          <p className="text-xs font-mono text-slate-300 bg-slate-950/80 border border-slate-800 rounded px-2 py-1 inline-block">
            {lobbyId}
          </p>

          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1">Debug params/searchParams:</p>
            <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
              {JSON.stringify({ params, searchParams }, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    const currentPlayers = lobby.members.length;
    const isFull =
      currentPlayers >= lobby.maxPlayers || lobby.status === "FULL";

    return (
      <div className="p-6 space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lobby.title}
          </h1>
          <p className="text-sm text-slate-400">
            {lobby.game?.name ?? "Jogo desconhecido"}{" "}
            {lobby.game?.platform && `• ${lobby.game.platform}`} •{" "}
            {currentPlayers}/{lobby.maxPlayers} jogadores
          </p>
        </header>

        <section className="space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-400">Status:</span>{" "}
            {lobby.status === "OPEN"
              ? "Aberto"
              : lobby.status === "FULL"
              ? "Cheio"
              : "Fechado"}{" "}
            • {currentPlayers}/{lobby.maxPlayers}
          </p>
          <p>
            <span className="text-slate-400">Descrição:</span>{" "}
            {lobby.description || "Sem descrição."}
          </p>
          <p>
            <span className="text-slate-400">Idioma:</span>{" "}
            {lobby.language || "Não informado"}
          </p>
          <p>
            <span className="text-slate-400">Região:</span>{" "}
            {lobby.region || "Global"}
          </p>
          <p className="text-xs text-slate-500">
            ID do lobby:{" "}
            <span className="font-mono">{lobby.id}</span>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Jogadores no lobby
          </h2>
          {lobby.members.length === 0 ? (
            <p className="text-xs text-slate-500">
              Ainda não há jogadores listados.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {lobby.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/80 px-3 py-1.5"
                >
                  <div className="flex flex-col">
                    <span className="text-slate-100 text-xs">
                      {m.user.username || m.user.name || "Jogador"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {m.userId === lobby.ownerId ? "Líder" : "Membro"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Debug extra pra garantir o ID resolvido */}
        <section className="mt-4 space-y-2">
          <p className="text-xs text-slate-500">
            Debug – lobbyId resolvido:{" "}
            <span className="font-mono">{lobbyId}</span>
          </p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify({ params, searchParams }, null, 2)}
          </pre>
        </section>
      </div>
    );
  } catch (e: any) {
    console.error("Erro ao carregar lobby:", e);

    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Erro ao carregar lobby</h1>
        <p className="text-sm text-slate-400">
          Ocorreu um erro ao buscar os dados deste lobby.
        </p>
        <div className="rounded-md bg-slate-950/80 border border-red-500/50 px-3 py-2">
          <p className="text-xs font-mono text-red-300 break-words">
            {e?.message ?? String(e)}
          </p>
        </div>

        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-1">Debug params/searchParams:</p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify({ params, searchParams }, null, 2)}
          </pre>
        </div>
      </div>
    );
  }
}
