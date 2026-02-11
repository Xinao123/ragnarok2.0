import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { importGameFromRawg } from "@/lib/games";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { requireCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  try {
    const csrf = await requireCsrf(req);
    if (csrf) return csrf;

    const user = await getCurrentUser();

    // opcional: só permitir usuários logados importarem novos jogos
    if (!user?.id) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const limit = await checkRateLimit(req, apiRateLimit, user.id);
    if (!limit.success) return limit.response;

    const body = await req.json();
    const rawgId = Number(body?.rawgId);

    if (!rawgId || Number.isNaN(rawgId)) {
      return NextResponse.json(
        { error: "rawgId inválido." },
        { status: 400 }
      );
    }

    const game = await importGameFromRawg(rawgId);

    return NextResponse.json({ game }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/games/import-from-rawg error:", e);
    return NextResponse.json(
      { error: e?.message || "Falha ao importar jogo da RAWG." },
      { status: 500 }
    );
  }
}
