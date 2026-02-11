import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { joinLobby } from "@/lib/lobbies";
import { requireCsrf } from "@/lib/csrf";
import { checkRateLimit, apiRateLimit } from "@/lib/rate-limit";

const ParamsSchema = z.object({
  lobbyId: z.string().cuid(),
});

export async function POST(req: Request, context: any) {
  try {
    const csrf = await requireCsrf(req);
    if (csrf) return csrf;

    // context.params pode ser um objeto ou um Promise<obj>
    const resolved = await Promise.resolve(context?.params);
    const parsed = ParamsSchema.safeParse(resolved);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "lobbyId invalido." },
        { status: 400 }
      );
    }
    const { lobbyId } = parsed.data;

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "NÃ£o autenticado." },
        { status: 401 }
      );
    }

    const limit = await checkRateLimit(req, apiRateLimit, user.id);
    if (!limit.success) return limit.response;

    const result = await joinLobby(lobbyId, user.id);

    return NextResponse.json({ result }, { status: 200 });
  } catch (e: any) {
    console.error("POST /api/lobbies/[lobbyId]/join error:", e);
    const message = e?.message || "Falha ao entrar no lobby.";
    const status =
      message.includes("nÃ£o encontrado") ||
      message.includes("cheio") ||
      message.includes("fechado")
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
