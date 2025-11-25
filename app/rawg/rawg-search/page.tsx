"use client";

import { useEffect, useState } from "react";

type RawgGameVM = {
  id: number;
  name: string;
  rating: number;
  background_image: string | null;
  released: string | null;
};

export default function RawgSearchPage() {
  const [q, setQ] = useState("");
  const [games, setGames] = useState<RawgGameVM[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) {
        setGames([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/rawg/games?search=${encodeURIComponent(q)}&page_size=9`
        );
        const json = await res.json();
        setGames(json.results || []);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">
        Buscar jogos (RAWG)
      </h1>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ex: Elden Ring, CS2, Valorant..."
        className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/40"
      />

      {loading && <p className="text-sm text-slate-400">Buscando...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {games.map((g) => (
          <div
            key={g.id}
            className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden"
          >
            {g.background_image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={g.background_image}
                alt={g.name}
                className="h-28 w-full object-cover"
              />
            )}
            <div className="p-3">
              <p className="text-sm font-semibold text-slate-100 line-clamp-1">
                {g.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                ⭐ {g.rating?.toFixed(1)} • {g.released || "sem data"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!loading && q.trim() && games.length === 0 && (
        <p className="text-sm text-slate-500">Nada encontrado.</p>
      )}

      <p className="text-[11px] text-slate-500 pt-2">
        Dados e imagens fornecidos por RAWG.io (atribuição exigida no plano free).
      </p>
    </div>
  );
}
