import { prisma } from "@/lib/prisma";

export async function areFriends(userId: string, otherUserId: string) {
  if (!userId || !otherUserId) return false;
  if (userId === otherUserId) return false;

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userAId: userId, userBId: otherUserId },
        { userAId: otherUserId, userBId: userId },
      ],
    },
    select: { id: true },
  });

  return !!friendship;
}
