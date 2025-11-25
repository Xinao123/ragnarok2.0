import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LobbyStatus, MemberStatus } from "@prisma/client";

// Lista lobbys (opcional, mas útil pra futuras integrações)
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

// POST aqui não é mais usado — toda criação acontece via Server Action em /lobbies.
// Mantemos apenas um stub com assinatura compatível para não dar erro de tipo.
export async function POST(_req: Request, _ctx: any) {
  return NextResponse.json(
    {
      error:
        "Criação de lobby via /api/lobbies está desativada. Use a página /lobbies (Server Actions).",
    },
    { status: 405 }
  );
}
