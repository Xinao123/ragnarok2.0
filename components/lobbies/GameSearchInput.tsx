"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type InitialGame = {
  id: string;
  name: string;
  platform: string;
  backgroundImageUrl?: string | null;
};

type RawgResult = {
  id: number;
  name: string;
  backgroundImage: string | null;
  rating: number;
  released: string | null;
  platforms: string[];
  genres: string[];
};

type Props = {
  initialGames: InitialGame[];
};

export function GameSearchInput({ initialGames }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<RawgResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<InitialGame | null>(null);
  const [open, setOpen] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // quando o usuário selecionar um jogo dos "recentes" do banco
  function selectExistingGame(game: InitialGame) {
    setSelectedGame(game);
    setSearch(game.name);
    setOpen(false);
  }

  // Buscar na RAWG com debounce
  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/games/search-rawg?q=${encodeURIComponent(search.trim())}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("RAWG search error:", res.status, text);
          setError("Falha ao buscar jogos.");
          setResults([]);
          return;
        }

        const data = await res.json();

        // 🔴 Aqui estava o bug clássico em muita implementação:
        // usar data.games em vez de data.results
        const rawResults: RawgResult[] = data.results ?? [];
        setResults(rawResults);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error("RAWG search exception:", e);
        setError("Erro ao buscar jogos.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, [search]);

  // Quando clicar num resultado da RAWG: salvar no banco e setar gameId
  async function handleSelectRawg(result: RawgResult) {
    try {
      setError(null);

      const res = await fetch("/api/games/ensure-from-rawg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawgId: result.id,
          name: result.name,
          backgroundImageUrl: result.backgroundImage,
          platforms: result.platforms,
          genres: result.genres,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("ensure-from-rawg error:", res.status, text);
        setError("Não foi possível salvar o jogo. Tente novamente.");
        return;
      }

      const json = await res.json();
      const game = json.game as InitialGame;

      setSelectedGame({
        id: game.id,
        name: game.name,
        platform: game.platform,
        backgroundImageUrl: game.backgroundImageUrl,
      });
      setSearch(game.name);
      setOpen(false);
    } catch (e) {
      console.error("handleSelectRawg exception:", e);
      setError("Erro ao selecionar jogo.");
    }
  }

  return (
    <div className="space-y-1 relative">
      {/* hidden para o server action */}
      <input
        type="hidden"
        name="gameId"
        value={selectedGame?.id ?? ""}
      />

      <label className="text-[11px] text-slate-300">
        Jogo do lobby
      </label>

      <div className="flex flex-col gap-1">
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Busque pelo nome do jogo (ex: VALORANT, CS2, LoL...)"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="text-[11px]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Fechar" : "Ver jogos"}
          </Button>
        </div>

        {selectedGame && (
          <p className="text-[11px] text-emerald-300">
            Jogo selecionado:{" "}
            <span className="font-medium text-emerald-200">
              {selectedGame.name}
            </span>{" "}
            <span className="text-emerald-400/80">
              ({selectedGame.platform || "Multi"})
            </span>
          </p>
        )}

        {error && (
          <p className="text-[11px] text-rose-300">{error}</p>
        )}
      </div>

      {/* dropdown de resultados */}
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-800 bg-slate-950/95 shadow-xl max-h-72 overflow-y-auto custom-scroll">
          {/* Jogos recentes do banco */}
          {initialGames.length > 0 && (
            <div className="border-b border-slate-800 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                Jogos recentes
              </p>
              <div className="space-y-1">
                {initialGames.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => selectExistingGame(g)}
                    className="w-full text-left text-[11px] px-2 py-1 rounded-md hover:bg-slate-800/80 flex flex-col"
                  >
                    <span className="text-slate-100">{g.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {g.platform}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* resultados RAWG */}
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Resultados da RAWG
            </p>

            {loading && (
              <p className="text-[11px] text-slate-400">
                Buscando jogos...
              </p>
            )}

            {!loading && results.length === 0 && search.length >= 2 && (
              <p className="text-[11px] text-slate-500">
                Nenhum jogo encontrado para &quot;{search}&quot;.
              </p>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRawg(r)}
                    className="w-full text-left text-[11px] px-2 py-1.5 rounded-md hover:bg-slate-800/80 flex gap-2"
                  >
                    {r.backgroundImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.backgroundImage}
                        alt={r.name}
                        className="h-10 w-16 rounded-md object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-100 truncate">
                        {r.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {r.platforms.join(", ") || "Multi"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {r.released
                          ? `Lançado em ${new Date(
                              r.released
                            ).toLocaleDateString("pt-BR")}`
                          : "Data de lançamento desconhecida"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.6);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
