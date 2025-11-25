"use client";

import { useEffect, useState } from "react";
import type { RawgGame } from "@/lib/rawg";

type GameSliderProps = {
  games: RawgGame[];
};

export function GameSlider({ games }: GameSliderProps) {
  const [index, setIndex] = useState(0);

  // avança automático
  useEffect(() => {
    if (games.length <= 1) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % games.length);
    }, 7000); // 7s por slide

    return () => clearInterval(id);
  }, [games.length]);

  if (!games.length) return null;

  const current = games[index] ?? games[0];

  const year = current.released
    ? new Date(current.released).getFullYear()
    : null;

  const platforms =
    current.parent_platforms?.map((p) => p.platform.name).join(", ") ||
    current.platforms?.map((p) => p.platform.name).join(", ") ||
    "Multiplataforma";

  const genres =
    current.genres?.map((g) => g.name).slice(0, 2).join(", ") || "Multiplayer";

  const rating =
    typeof current.rating === "number"
      ? current.rating.toFixed(1)
      : "0.0";

  const summary = `${genres} • ${platforms}${
    year ? ` • ${year}` : ""
  } • ⭐ ${rating}`;

  const goNext = () => {
    setIndex((prev) => (prev + 1) % games.length);
  };

  const goPrev = () => {
    setIndex((prev) => (prev - 1 + games.length) % games.length);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-xl shadow-sky-900/30">
      <div className="grid gap-4 md:grid-cols-[3fr,2fr] items-stretch">
        {/* Imagem grande */}
        <div className="relative h-52 sm:h-64 md:h-72 rounded-2xl overflow-hidden bg-slate-900">
          {current.background_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.background_image}
              alt={current.name}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* título sobreposto */}
          <div className="absolute bottom-4 left-4 right-4">
            <p className="text-[11px] uppercase tracking-wide text-sky-300 mb-1">
              Jogos online em destaque
            </p>
            <h3 className="text-lg md:text-xl font-semibold text-white line-clamp-2 drop-shadow">
              {current.name}
            </h3>
          </div>

          {/* controles em cima da imagem (canto direito) */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 border border-slate-600 flex items-center justify-center text-xs text-slate-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              className="h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 border border-slate-600 flex items-center justify-center text-xs text-slate-100"
            >
              ›
            </button>
          </div>
        </div>

        {/* texto / resumo */}
        <div className="flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              Resumo rápido sobre este jogo:
            </p>
            <p className="text-sm text-slate-100">{summary}</p>

            {current.short_screenshots && current.short_screenshots.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900/60">
                {current.short_screenshots.slice(0, 4).map((shot) => (
                  <div
                    key={shot.id}
                    className="h-16 w-28 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shot.image}
                      alt={`Screenshot de ${current.name}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* indicadores pequenos dos slides */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-500">
              Slide {index + 1} de {games.length}
            </p>
            <div className="flex gap-1.5">
              {games.map((g, i) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-5 bg-sky-400"
                      : "w-2 bg-slate-600 hover:bg-slate-400"
                  }`}
                  aria-label={`Ir para o jogo ${g.name}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-500 text-right">
        Dados e imagens fornecidos por RAWG.io.
      </p>
    </div>
  );
}
