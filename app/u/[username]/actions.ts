"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { checkRateLimit, friendRequestLimit } from "@/lib/rate-limit";

export async function sendFriendRequestAction(formData: FormData) {
    const targetUserId = formData.get("targetUserId")?.toString();
    const path = formData.get("path")?.toString() || "/";

    const currentUser = await getCurrentUser();

    // precisa estar logado e ter alvo válido
    if (!currentUser || !targetUserId) {
        return;
    }

    const req = new Request("http://local/friends/request", {
        headers: new Headers(await headers()),
    });
    const limit = await checkRateLimit(req, friendRequestLimit, currentUser.id);
    if (!limit.success) {
        return;
    }

    // não pode se adicionar
    if (currentUser.id === targetUserId) {
        return;
    }

    // checar se já existe amizade
    const [id1, id2] =
        currentUser.id < targetUserId
            ? [currentUser.id, targetUserId]
            : [targetUserId, currentUser.id];

    const existingFriendship = await prisma.friendship.findFirst({
        where: { userAId: id1, userBId: id2 },
    });

    if (existingFriendship) {
        // já são amigos, não faz nada
        return;
    }

    // checar se já existe solicitação pendente entre os dois (em qualquer direção)
    const existingPending = await prisma.friendRequest.findFirst({
        where: {
            OR: [
                {
                    fromUserId: currentUser.id,
                    toUserId: targetUserId,
                    status: "PENDING",
                },
                {
                    fromUserId: targetUserId,
                    toUserId: currentUser.id,
                    status: "PENDING",
                },
            ],
        },
    });

    if (!existingPending) {
        await prisma.friendRequest.create({
            data: {
                fromUserId: currentUser.id,
                toUserId: targetUserId,
                status: "PENDING",
            },
        });
    }

    // revalidar a página do perfil público, pra atualizar o estado do botão
    if (path) {
        revalidatePath(path);
    }
}
