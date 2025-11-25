import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { joinLobby } from "@/lib/lobbies";

export async function POST(
  _req: any,
  { params }: { params: Promise<{ lobbyId: string }> }
) {
  try {
    const { lobbyId } = await params;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "Não autenticado." },
        { status: 401 }
      );
    }

    if (!lobbyId) {
      return NextResponse.json(
        { error: "lobbyId é obrigatório." },
        { status: 400 }
      );
    }

    const result = await joinLobby(lobbyId, user.id);

    return NextResponse.json({ result }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/lobbies/[lobbyId]/join error:", e);
    const message = e?.message || "Falha ao entrar no lobby.";
    const status =
      message.includes("não encontrado") ||
      message.includes("cheio") ||
      message.includes("fechado")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
