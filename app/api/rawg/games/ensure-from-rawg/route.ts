import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCsrf } from "@/lib/csrf";

export async function POST(req: Request) {
  try {
    const csrf = await requireCsrf(req);
    if (csrf) return csrf;

    const body = await req.json();
    const {
      rawgId,
      name,
      backgroundImageUrl,
      platforms,
      genres,
    } = body as {
      rawgId: number;
      name: string;
      backgroundImageUrl?: string | null;
      platforms?: string[];
      genres?: string[];
    };

    if (!rawgId || !name) {
      return NextResponse.json(
        { error: "Dados de jogo inválidos." },
        { status: 400 }
      );
    }

    const slug = String(rawgId);
    const platform =
      platforms && platforms.length > 0
        ? platforms.join(", ").slice(0, 80)
        : "Multi";

    const game = await prisma.game.upsert({
      where: { slug },
      update: {
        name,
        platform,
        // se você tiver esse campo no schema
        backgroundImageUrl: backgroundImageUrl ?? null,
      },
      create: {
        name,
        slug,
        platform,
        // se você tiver esse campo no schema
        backgroundImageUrl: backgroundImageUrl ?? null,
      },
    });

    return NextResponse.json({ game }, { status: 200 });
  } catch (e) {
    console.error("POST /api/games/ensure-from-rawg error:", e);
    return NextResponse.json(
      { error: "Erro ao salvar jogo." },
      { status: 500 }
    );
  }
}
