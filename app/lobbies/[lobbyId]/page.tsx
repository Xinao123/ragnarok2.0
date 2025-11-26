// app/lobbies/[lobbyId]/page.tsx  (ou [id], tanto faz o nome da pasta)
import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";

type PageProps = {
  params: Record<string, string | string[]>;
};

// Função genérica pra achar o ID a partir de qualquer chave de params
function resolveLobbyId(params: Record<string, string | string[]>): string | null {
  if (!params) return null;

  const keys = Object.keys(params);
  if (keys.length === 0) return null;

  const key = keys[0]; // pega o primeiro param dinâmico da rota
  const raw = params[key];

  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === "string") return raw;

  return String(raw);
}

export default async function LobbyDetailPage({ params }: PageProps) {
  const lobbyId = resolveLobbyId(params);

  // Se não conseguimos resolver um ID, nem toca no banco
  if (!lobbyId) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-xl font-semibold">Lobby inválido</h1>
        <p className="text-sm text-slate-400">
          O identificador deste lobby não é válido.
        </p>

        <div className="mt-3">
          <p className="text-xs text-slate-500 mb-1">Debug params:</p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify(params, null, 2)}
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
          where: { status: MemberStatus.ACTIVE },
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
            <p className="text-xs text-slate-500 mb-1">Debug params:</p>
            <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
              {JSON.stringify(params, null, 2)}
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

        {/* Debug extra pra garantir o que está vindo de params / lobbyId */}
        <section className="mt-4 space-y-2">
          <p className="text-xs text-slate-500">
            Debug – param resolvido:{" "}
            <span className="font-mono">{lobbyId}</span>
          </p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify(params, null, 2)}
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
          <p className="text-xs text-slate-500 mb-1">Debug params:</p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify(params, null, 2)}
          </pre>
        </div>
      </div>
    );
  }
}
