"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@prisma/client";
import { uploadAvatarToMinio } from "@/lib/storage";
import { sanitizeText } from "@/lib/sanitize";
import { logError } from "@/lib/logger";


type ImageMime = "image/jpeg" | "image/png" | "image/webp";

function detectImageMime(buffer: Buffer): ImageMime | null {
    if (buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return "image/png";
    }

    // WEBP: "RIFF"...."WEBP"
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return "image/webp";
    }

    return null;
}

function getExtension(name: string | null | undefined): string | null {
    if (!name) return null;
    const parts = name.split(".");
    if (parts.length < 2) return null;
    return parts[parts.length - 1].toLowerCase();
}

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

    const rawName = (formData.get("name") ?? "").toString();
    const rawBio = (formData.get("bio") ?? "").toString();

    const name = sanitizeText(rawName);
    const bio = sanitizeText(rawBio);
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

        if (!errors.avatar) {
            const arrayBuffer = await avatarFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const detected = detectImageMime(buffer);
            if (!detected) {
                errors.avatar = "Formato inválido. Use JPG, PNG ou WEBP.";
            } else {
                const ext = getExtension(avatarFile.name);
                const allowedExts = ["jpg", "jpeg", "png", "webp"];
                if (!ext || !allowedExts.includes(ext)) {
                    errors.avatar = "Extensão inválida. Use JPG, PNG ou WEBP.";
                }
            }

            if (!errors.avatar && detected) {
                try {
                    avatarUrl = await uploadAvatarToMinio(
                        user.id,
                        buffer,
                        detected
                    );
                } catch (err) {
                    logError("[profile] upload avatar failed:", err);
                    errors.avatar =
                        "Falha ao enviar avatar. Verifique as configurações do storage.";
                }
            }
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
