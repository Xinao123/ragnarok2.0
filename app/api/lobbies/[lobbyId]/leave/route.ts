import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { leaveLobby } from "@/lib/lobbies";

type RouteParams = {
  params: {
    lobbyId: string;
  };
};

export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    const lobbyId = params.lobbyId;
    if (!lobbyId) {
      return NextResponse.json(
        { error: "lobbyId é obrigatório." },
        { status: 400 }
      );
    }

    await leaveLobby(lobbyId, user.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error(`POST /api/lobbies/${params.lobbyId}/leave error:`, e);
    return NextResponse.json(
      { error: "Falha ao sair do lobby." },
      { status: 500 }
    );
  }
}
