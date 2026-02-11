"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/logger";

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

type SelectedGame =
  | {
      source: "db";
      id: string;
      name: string;
      platform: string;
      backgroundImageUrl?: string | null;
    }
  | {
      source: "rawg";
      rawgId: number;
      name: string;
      platform: string;
      image?: string | null;
    };

type Props = {
  initialGames: InitialGame[];
};

export function GameSearchInput({ initialGames }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<RawgResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<SelectedGame | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // filtra jogos já salvos no banco conforme digita
  const filteredInitial = search.trim()
    ? initialGames.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase())
      )
    : initialGames;

  // buscar jogos na RAWG conforme o usuário digita
  useEffect(() => {
    const term = search.trim();

    // se limpar o campo, não busca na RAWG
    if (!term) {
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
          `/api/games/search-rawg?q=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          logError("RAWG search error:", res.status, text);
          setError("Falha ao buscar jogos.");
          setResults([]);
          return;
        }

        const data = await res.json();
        const rawResults: RawgResult[] = data.results ?? [];
        setResults(rawResults);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        logError("RAWG search exception:", e);
        setError("Erro ao buscar jogos.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, [search]);

  // selecionar jogo já salvo no banco
  function selectExistingGame(game: InitialGame) {
    setSelectedGame({
      source: "db",
      id: game.id,
      name: game.name,
      platform: game.platform,
      backgroundImageUrl: game.backgroundImageUrl,
    });
    setSearch(game.name);
  }

  // selecionar jogo vindo da RAWG
  function handleSelectRawg(result: RawgResult) {
    const platform =
      result.platforms && result.platforms.length > 0
        ? result.platforms[0]
        : "Multi";

    setSelectedGame({
      source: "rawg",
      rawgId: result.id,
      name: result.name,
      platform,
      image: result.backgroundImage,
    });

    setSearch(result.name);
  }

  // valores dos campos hidden pro form (server action)
  const gameIdHidden =
    selectedGame?.source === "db" ? selectedGame.id : "";
  const rawgIdHidden =
    selectedGame?.source === "rawg"
      ? String(selectedGame.rawgId)
      : "";
  const rawgNameHidden =
    selectedGame?.source === "rawg" ? selectedGame.name : "";
  const rawgPlatformHidden = selectedGame
    ? selectedGame.platform
    : "";
  const rawgImageHidden =
    selectedGame?.source === "rawg"
      ? selectedGame.image || ""
      : "";

  return (
    <div className="space-y-1">
      {/* hidden inputs usados pelo server action */}
      <input type="hidden" name="gameId" value={gameIdHidden} />
      <input type="hidden" name="rawgId" value={rawgIdHidden} />
      <input type="hidden" name="rawgName" value={rawgNameHidden} />
      <input
        type="hidden"
        name="rawgPlatform"
        value={rawgPlatformHidden}
      />
      <input
        type="hidden"
        name="rawgImage"
        value={rawgImageHidden}
      />

      <label className="text-[11px] text-slate-300">
        Jogo do lobby
      </label>

      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
          }}
          placeholder="Digite o nome do jogo (ex: VALORANT, CS2, LoL...)"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
        />

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

      {/* LISTA DE SUGESTÕES (sempre visível, muda conforme digita) */}
      <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950/95 shadow-inner max-h-72 overflow-y-auto custom-scroll">
        {/* Jogos do banco (filtrados pelo que foi digitado) */}
        {filteredInitial.length > 0 && (
          <div className="border-b border-slate-800 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
              Jogos salvos
            </p>
            <div className="space-y-1">
              {filteredInitial.map((g) => (
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

        {/* Resultados da RAWG (conforme digita) */}
        <div className="px-3 py-2">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
            Resultados da RAWG
          </p>

          {!search.trim() && (
            <p className="text-[11px] text-slate-500">
              Comece a digitar para buscar jogos online.
            </p>
          )}

          {search.trim() && loading && (
            <p className="text-[11px] text-slate-400">
              Buscando jogos para &quot;{search}&quot;...
            </p>
          )}

          {search.trim() && !loading && results.length === 0 && !error && (
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
