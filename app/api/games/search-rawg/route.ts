import { NextResponse } from "next/server";
import { searchGames } from "@/lib/rawg";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || searchParams.get("query");

  const query = q?.trim() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await searchGames(query, 1, 10);

    const simplified = res.results
      .filter((g) => g.background_image)
      .map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        backgroundImage: g.background_image,
        rating: g.rating,
        released: g.released,
        platforms:
          g.parent_platforms?.map((p) => p.platform.name) ??
          g.platforms?.map((p) => p.platform.name) ??
          [],
        genres: g.genres?.map((gg) => gg.name) ?? [],
      }));

    return NextResponse.json({ results: simplified });
  } catch (e) {
    console.error("GET /api/games/search-rawg error:", e);
    return NextResponse.json(
      { error: "Falha ao buscar jogos na RAWG.", results: [] },
      { status: 500 }
    );
  }
}
