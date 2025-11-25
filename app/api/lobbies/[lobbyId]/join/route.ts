import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { joinLobby } from "@/lib/lobbies";

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

    const result = await joinLobby(lobbyId, user.id);

    return NextResponse.json({ result }, { status: 200 });
  } catch (e: any) {
    console.error(`POST /api/lobbies/${params.lobbyId}/join error:`, e);
    const message = e?.message || "Falha ao entrar no lobby.";
    const status =
      message.includes("não encontrado") || message.includes("cheio") ||
      message.includes("fechado")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
