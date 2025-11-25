"use client";

import { useState } from "react";

type DbGame = {
  id: string;
  name: string;
  platform: string;
  backgroundImageUrl: string | null;
};

type RawgSearchResult = {
  id: number;
  name: string;
  backgroundImage: string | null;
  rating: number;
  released: string | null;
  platforms: string[];
  genres: string[];
};

type GameSearchInputProps = {
  name?: string; // nome do campo hidden (gameId)
  initialGames: DbGame[];
};

export function GameSearchInput({
  name = "gameId",
  initialGames,
}: GameSearchInputProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RawgSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedGame, setSelectedGame] = useState<DbGame | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const term = query.trim();
    if (term.length < 2) {
      setError("Digite pelo menos 2 caracteres para buscar.");
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const res = await fetch(
        `/api/games/search-rawg?q=${encodeURIComponent(term)}`
      );

      if (!res.ok) {
        throw new Error("Falha ao buscar jogos na RAWG.");
      }

      const data = await res.json();
      setResults(data.results ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao buscar jogos.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleImport(rawgGame: RawgSearchResult) {
    try {
      setImportingId(rawgGame.id);
      setError(null);

      const res = await fetch("/api/games/import-from-rawg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawgId: rawgGame.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao importar jogo.");
      }

      const game = data.game as DbGame;
      setSelectedGame({
        id: game.id,
        name: game.name,
        platform: game.platform,
        backgroundImageUrl: game.backgroundImageUrl ?? null,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro ao importar jogo.");
    } finally {
      setImportingId(null);
    }
  }

  function handleSelectExisting(game: DbGame) {
    setSelectedGame(game);
  }

  return (
    <div className="space-y-2">
      {/* hidden com o gameId selecionado (usado pelo form do lobby) */}
      <input
        type="hidden"
        name={name}
        value={selectedGame?.id ?? ""}
      />

      <div className="space-y-1">
        <label className="text-[11px] text-slate-300">Jogo</label>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome do jogo (ex: Valorant, CS2, LoL...)"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
          />
          <button
            type="submit"
            className="rounded-md bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-white disabled:opacity-60"
            disabled={searching}
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </form>
        <p className="text-[10px] text-slate-500">
          Os resultados vêm da RAWG.io. Ao escolher um jogo, ele é salvo no seu
          banco para usar em futuros lobbies.
        </p>
      </div>

      {/* jogo selecionado */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 flex gap-2 items-center">
        {selectedGame?.backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedGame.backgroundImageUrl}
            alt={selectedGame.name}
            className="h-10 w-16 rounded-md object-cover"
          />
        ) : (
          <div className="h-10 w-16 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
            Jogo
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-100 truncate">
            {selectedGame ? selectedGame.name : "Nenhum jogo selecionado ainda"}
          </p>
          <p className="text-[10px] text-slate-400">
            {selectedGame
              ? selectedGame.platform
              : "Use a busca acima ou escolha um jogo recente."}
          </p>
        </div>
      </div>

      {/* jogos usados recentemente */}
      {initialGames.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500">
            Jogos usados recentemente:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {initialGames.slice(0, 8).map((g) => {
              const isActive = selectedGame?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleSelectExisting(g)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition-colors ${
                    isActive
                      ? "border-sky-500 bg-sky-500/20 text-sky-100"
                      : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-sky-500 hover:text-sky-200"
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* resultados da RAWG */}
      {results.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-slate-500">
            Resultados da RAWG para &quot;{query}&quot;:
          </p>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/90 p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/60">
            {results.map((r) => {
              const isImporting = importingId === r.id;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-md bg-slate-900/80 p-2"
                >
                  <div className="h-10 w-16 rounded-md overflow-hidden bg-slate-800">
                    {r.backgroundImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.backgroundImage}
                        alt={r.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-100 truncate">
                      {r.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {(r.genres[0] || "Multiplayer") +
                        " • " +
                        (r.platforms[0] || "Multi") +
                        (r.released
                          ? " • " + new Date(r.released).getFullYear()
                          : "")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleImport(r)}
                    className="rounded-md border border-sky-500/60 bg-sky-500/10 px-2 py-1 text-[10px] text-sky-100 hover:bg-sky-500/20 disabled:opacity-60"
                    disabled={isImporting}
                  >
                    {isImporting ? "Importando..." : "Usar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
