import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LobbyStatus, MemberStatus } from "@prisma/client";
import { requireCsrf } from "@/lib/csrf";
import { checkRateLimit, apiRateLimit } from "@/lib/rate-limit";

// Lista lobbys (opcional, mas Ãºtil pra futuras integraÃ§Ãµes)
export async function GET(_req: Request) {
  try {
    const lobbies = await prisma.lobby.findMany({
      where: {
        status: {
          in: [LobbyStatus.OPEN, LobbyStatus.FULL],
        },
      },
      include: {
        game: true,
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
          where: { status: MemberStatus.ACTIVE },
          select: {
            userId: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ lobbies }, { status: 200 });
  } catch (e) {
    console.error("GET /api/lobbies error:", e);
    return NextResponse.json(
      { error: "Falha ao listar lobbys." },
      { status: 500 }
    );
  }
}

// POST aqui nÃ£o Ã© mais usado â€” toda criaÃ§Ã£o acontece via Server Action em /lobbies.
// Mantemos apenas um stub com assinatura compatÃ­vel para nÃ£o dar erro de tipo.
export async function POST(req: Request, _ctx: any) {
  const csrf = await requireCsrf(req);
  if (csrf) return csrf;

  const limit = await checkRateLimit(req, apiRateLimit);
  if (!limit.success) return limit.response;

  return NextResponse.json(
    {
      error:
        "CriaÃ§Ã£o de lobby via /api/lobbies estÃ¡ desativada. Use a pÃ¡gina /lobbies (Server Actions).",
    },
    { status: 405 }
  );
}
