import { searchGames } from "@/lib/rawg";

export default async function RawgTestPage() {
  const data = await getTrendingGames(1, 12);
  const games = data.results;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            RAWG • Trending Games
          </h1>
          <p className="text-sm text-slate-400">
            Fonte: RAWG.io 
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((g) => (
          <div
            key={g.id}
            className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/60"
          >
            <div className="relative h-40 bg-slate-900">
              {g.background_image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={g.background_image}
                  alt={g.name}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <h2 className="text-base font-semibold text-white line-clamp-1">
                  {g.name}
                </h2>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-200/80">
                  {g.released && <span>{g.released}</span>}
                  <span>⭐ {g.rating?.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="p-3 text-xs text-slate-300">
              <p className="line-clamp-2">
                Plataformas:{" "}
                {g.platforms?.map((p) => p.platform.name).join(", ") || "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
