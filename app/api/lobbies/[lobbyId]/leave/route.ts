import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { leaveLobby } from "@/lib/lobbies";
import { requireCsrf } from "@/lib/csrf";
import { checkRateLimit, apiRateLimit } from "@/lib/rate-limit";

const ParamsSchema = z.object({
  lobbyId: z.string().cuid(),
});

export async function POST(req: Request, context: any) {
  try {
    const csrf = await requireCsrf(req);
    if (csrf) return csrf;

    // context.params pode ser Promise ou objeto direto
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

    await leaveLobby(lobbyId, user.id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/lobbies/[lobbyId]/leave error:", e);
    return NextResponse.json(
      { error: "Falha ao sair do lobby." },
      { status: 500 }
    );
  }
}
