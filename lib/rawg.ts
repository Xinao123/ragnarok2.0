const RAWG_BASE = "https://api.rawg.io/api";

export type RawgGame = {
  id: number;
  name: string;
  slug: string;
  released: string | null;
  rating: number;
  background_image: string | null;
  short_screenshots?: { id: number; image: string }[];
  platforms?: {
    platform: { id: number; name: string; slug: string };
  }[];
};

export type RawgGamesResponse = {
  results: RawgGame[];
  count: number;
  next: string | null;
  previous: string | null;
};

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${RAWG_BASE}${path}`);
  url.searchParams.set("key", process.env.RAWG_API_KEY || "");

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  return url.toString();
}

async function rawgGet<T>(path: string, params: Record<string, any>) {
  const url = buildUrl(path, params);

  const res = await fetch(url, {
    // cache leve pra não estourar limite
    next: { revalidate: 60 * 60 }, // 1h
    headers: {
      "User-Agent": "Ragnarok2.0/1.0 (+https://seuapp)", // RAWG recomenda identificar app :contentReference[oaicite:2]{index=2}
    },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`RAWG error ${res.status}: ${txt}`);
  }

  return (await res.json()) as T;
}

export function getTrendingGames(page = 1, pageSize = 12) {
  // ordering=-added (mais “trending/anticipados”) :contentReference[oaicite:3]{index=3}
  return rawgGet<RawgGamesResponse>("/games", {
    ordering: "-added",
    page,
    page_size: pageSize,
  });
}

export function searchGames(search: string, page = 1, pageSize = 12) {
  return rawgGet<RawgGamesResponse>("/games", {
    search,
    page,
    page_size: pageSize,
  });
}
