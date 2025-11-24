import { auth } from "@/auth";
import { prisma } from "./prisma";

export async function getCurrentUser() {
    const session = await auth();

    if (!session?.user) return null;

    const id = (session.user as any).id as string | undefined;
    if (!id) return null;

    const user = await prisma.user.findUnique({
        where: { id },
    });

    return user;
}
