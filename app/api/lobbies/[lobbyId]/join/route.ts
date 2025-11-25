import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { joinLobby } from "@/lib/lobbies";

type RouteContext = {
  params: {
    lobbyId: string;
  };
};

export async function POST(
  _req: NextRequest,
  { params }: RouteContext
) {
  try {
    const lobbyId = params.lobbyId;

    if (!lobbyId) {
      return NextResponse.json(
        { error: "lobbyId é obrigatório." },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const result = await joinLobby(lobbyId, user.id);

    return NextResponse.json({ result }, { status: 200 });
  } catch (e: unknown) {
    console.error(
      `POST /api/lobbies/${params.lobbyId}/join error:`,
      e
    );

    const message =
      e &&
      typeof e === "object" &&
      "message" in e &&
      typeof (e as any).message === "string"
        ? (e as any).message
        : "Falha ao entrar no lobby.";

    const status =
      message.includes("não encontrado") ||
      message.includes("cheio") ||
      message.includes("fechado")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
