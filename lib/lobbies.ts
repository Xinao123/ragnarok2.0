import { prisma } from "@/lib/prisma";
import { LobbyStatus, MemberRole, MemberStatus } from "@prisma/client";

type CreateLobbyInput = {
  ownerId: string;
  gameId: string;
  title: string;
  description?: string;
  maxPlayers: number;
  language?: string | null;
  region?: string | null;
};

export async function createLobby(input: CreateLobbyInput) {
  const {
    ownerId,
    gameId,
    title,
    description,
    maxPlayers,
    language,
    region,
  } = input;

  if (maxPlayers < 2) {
    throw new Error("O lobby precisa ter pelo menos 2 vagas.");
  }

  return prisma.$transaction(async (tx: any) => {
    // cria o lobby
    const lobby = await tx.lobby.create({
      data: {
        title,
        description,
        maxPlayers,
        status: LobbyStatus.OPEN,
        gameId,
        ownerId,
        language,
        region,
      },
    });

    // adiciona o dono como LEADER e ACTIVE
    await tx.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: ownerId,
        role: MemberRole.LEADER,
        status: MemberStatus.ACTIVE,
      },
    });

    return lobby;
  });
}

type JoinLobbyResult = {
  lobbyId: string;
  membersCount: number;
  status: LobbyStatus;
};

/**
 * Faz o usuário entrar no lobby.
 * - Checa se lobby existe e não está fechado
 * - Checa se já está cheio
 * - Cria LobbyMember se ainda não existir
 * - Atualiza status para FULL se encher
 */
export async function joinLobby(
  lobbyId: string,
  userId: string
): Promise<JoinLobbyResult> {
  return prisma.$transaction(async (tx: any) => {
    const lobby = await tx.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        members: {
          where: { status: MemberStatus.ACTIVE },
          select: { userId: true },
        },
      },
    });

    if (!lobby) {
      throw new Error("Lobby não encontrado.");
    }

    if (lobby.status === LobbyStatus.CLOSED) {
      throw new Error("Este lobby está fechado.");
    }

    // já está dentro como ACTIVE?
    const alreadyMember = lobby.members.some((m: any) => m.userId === userId);
    if (alreadyMember) {
      return {
        lobbyId: lobby.id,
        membersCount: lobby.members.length,
        status: lobby.status,
      };
    }

    // está cheio?
    const currentCount = lobby.members.length;
    if (currentCount >= lobby.maxPlayers) {
      throw new Error("Este lobby já está cheio.");
    }

    // adiciona membro
    await tx.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId,
        role: MemberRole.MEMBER,
        status: MemberStatus.ACTIVE,
      },
    });

    const newCount = currentCount + 1;
    let newStatus = lobby.status;

    if (newCount >= lobby.maxPlayers) {
      const updated = await tx.lobby.update({
        where: { id: lobby.id },
        data: { status: LobbyStatus.FULL },
      });
     newStatus = "FULL";
    }

    return {
      lobbyId: lobby.id,
      membersCount: newCount,
      status: newStatus,
    };
  });
}

/**
 * Marca o membro como LEFT.
 * Se todos saírem, fecha o lobby.
 */
export async function leaveLobby(lobbyId: string, userId: string) {
  return prisma.$transaction(async (tx: any ) => {
    const member = await tx.lobbyMember.findFirst({
      where: {
        lobbyId,
        userId,
        status: MemberStatus.ACTIVE,
      },
    });

    if (!member) {
      // já não está mais ativo, nada pra fazer
      return;
    }

    await tx.lobbyMember.update({
      where: { id: member.id },
      data: { status: MemberStatus.LEFT },
    });

    // checa quantos ainda estão ativos
    const activeCount = await tx.lobbyMember.count({
      where: {
        lobbyId,
        status: MemberStatus.ACTIVE,
      },
    });

    if (activeCount === 0) {
      // ninguém mais no lobby -> fecha
      await tx.lobby.update({
        where: { id: lobbyId },
        data: { status: LobbyStatus.CLOSED },
      });
    }
  });
}

/**
 * Busca lobbys listáveis na página (ex: só OPEN/FULL, recentes)
 */
export async function listPublicLobbies(limit = 20) {
  return prisma.lobby.findMany({
    where: {
      status: {
        in: [LobbyStatus.OPEN, LobbyStatus.FULL],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      game: true,
      owner: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      members: {
        where: { status: MemberStatus.ACTIVE },
        select: { id: true },
      },
    },
  });
}
