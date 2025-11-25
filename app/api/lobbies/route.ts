import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createLobby, listPublicLobbies } from "@/lib/lobbies";

// Lista lobbys públicos para a página /lobbies
export async function GET() {
  try {
    const lobbies = await listPublicLobbies(50);
    return NextResponse.json({ lobbies });
  } catch (e) {
    console.error("GET /api/lobbies error:", e);
    return NextResponse.json(
      { error: "Falha ao carregar lobbys." },
      { status: 500 }
    );
  }
}

// Cria um novo lobby
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      gameId,
      title,
      description,
      maxPlayers,
      language,
      region,
    } = body || {};

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json(
        { error: "gameId é obrigatório." },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title é obrigatório." },
        { status: 400 }
      );
    }

    const max = Number(maxPlayers);
    if (!max || Number.isNaN(max) || max < 2 || max > 16) {
      return NextResponse.json(
        { error: "maxPlayers deve ser um número entre 2 e 16." },
        { status: 400 }
      );
    }

    const lobby = await createLobby({
      ownerId: user.id,
      gameId,
      title: title.trim(),
      description: description?.toString().trim() || undefined,
      maxPlayers: max,
      language: language?.toString().trim() || undefined,
      region: region?.toString().trim() || undefined,
    });

    return NextResponse.json({ lobby }, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/lobbies error:", e);
    return NextResponse.json(
      { error: e?.message || "Falha ao criar lobby." },
      { status: 500 }
    );
  }
}
