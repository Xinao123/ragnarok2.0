import { NextResponse } from "next/server";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

const RAWG_BASE = "https://api.rawg.io/api";

export async function GET(req: Request) {
  const limit = await checkRateLimit(req, apiRateLimit);
  if (!limit.success) return limit.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("page_size") || "12";

  const url = new URL(`${RAWG_BASE}/games`);
  url.searchParams.set("key", process.env.RAWG_API_KEY || "");
  url.searchParams.set("page", page);
  url.searchParams.set("page_size", pageSize);

  if (search.trim()) url.searchParams.set("search", search.trim());

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "Ragnarok2.0/1.0 (+https://seuapp)" },
    cache: "no-store", // search é dinâmico
  });

  if (!res.ok) {
    const txt = await res.text();
    return NextResponse.json({ error: txt }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
