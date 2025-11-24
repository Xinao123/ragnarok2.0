import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function LobbiesPage() {
  const lobbies = await prisma.lobby.findMany({
    include: {
      game: true,
      members: true,
      owner: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Lobbies disponíveis
        </h1>
        <p className="text-sm text-slate-400">
          Listagem inicial de lobbies vindo do PostgreSQL via Prisma. Em breve,
          você poderá criar e entrar em salas em tempo real.
        </p>
      </header>

      <div className="flex justify-between items-center gap-2">
        <p className="text-xs text-slate-500">
          {lobbies.length === 0
            ? "Nenhum lobby encontrado."
            : `${lobbies.length} lobby(s) encontrado(s).`}
        </p>

        <Button size="sm" disabled>
          Criar novo lobby (em breve)
        </Button>
      </div>

      {lobbies.length === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-700 rounded-lg px-4 py-6">
          Ainda não há lobbies cadastrados. Em breve você poderá criar um
          diretamente pela interface.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lobbies.map((lobby) => {
            const currentPlayers = lobby.members.length;
            const isFull = currentPlayers >= lobby.maxPlayers;

            return (
              <Card
                key={lobby.id}
                className="border-slate-800 bg-slate-900/80 hover:border-sky-600/70 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm flex flex-col">
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
                        Líder: {lobby.owner.username || lobby.owner.name || "Jogador"}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 text-[11px] text-slate-400 space-y-1.5">
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
                  <p className="text-slate-500">
                    ID do lobby:{" "}
                    <span className="font-mono text-[10px]">{lobby.id}</span>
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

