"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";
import { uploadAvatarToMinio } from "@/lib/storage";


export type ProfileFormState = {
    success: boolean;
    message?: string;
    errors?: {
        name?: string;
        bio?: string;
        avatar?: string;
        _form?: string;
    };
};

const defaultState: ProfileFormState = {
    success: false,
    errors: {},
};

export async function updateProfileAction(
    _prevState: ProfileFormState = defaultState,
    formData: FormData
): Promise<ProfileFormState> {
    const user = (await getCurrentUser()) as User | null;

    if (!user) {
        return {
            success: false,
            errors: { _form: "Você precisa estar logado para editar o perfil." },
        };
    }

    const name = (formData.get("name") ?? "").toString().trim();
    const bio = (formData.get("bio") ?? "").toString().trim();
    const avatarFile = formData.get("avatar") as File | null;

    const errors: ProfileFormState["errors"] = {};

    if (name.length > 50) {
        errors.name = "Nome muito longo (máx. 50 caracteres).";
    }

    if (bio.length > 500) {
        errors.bio = "Bio muito longa (máx. 500 caracteres).";
    }

    let avatarUrl: string | undefined;

    if (avatarFile && avatarFile.size > 0) {
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (avatarFile.size > maxSize) {
            errors.avatar = "Imagem deve ter no máximo 2MB.";
        }

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(avatarFile.type)) {
            errors.avatar = "Formato inválido. Use JPG, PNG ou WEBP.";
        }

        if (!errors.avatar) {
            const arrayBuffer = await avatarFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            avatarUrl = await uploadAvatarToMinio(
                user.id,
                buffer,
                avatarFile.type
            );
        }
    }

    if (Object.keys(errors).length > 0) {
        return { success: false, errors };
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            name: name || null,
            bio: bio || null,
            ...(avatarUrl ? { avatarUrl } : {}),
        },
    });


    return {
        success: true,
        message: "Perfil atualizado com sucesso!",
        errors: {},
    };
}
