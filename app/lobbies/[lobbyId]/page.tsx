// app/lobbies/[lobbyId]/page.tsx
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: { lobbyId: string };
};

export default async function LobbyDetailPage({ params }: PageProps) {
  const { lobbyId } = params;

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

    // Se não existir lobby com esse ID:
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
        </div>
      );
    }

    const currentPlayers = lobby.members.length;

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

        {/* Bloco de debug opcional: remove depois se quiser */}
        <section className="mt-4">
          <p className="text-xs text-slate-500 mb-1">
            Debug (JSON do lobby) — só para desenvolvimento:
          </p>
          <pre className="text-[11px] leading-snug bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto text-slate-200">
            {JSON.stringify(lobby, null, 2)}
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
      </div>
    );
  }
}
