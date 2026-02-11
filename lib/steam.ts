import { logError } from "@/lib/logger";

const STEAM_STORE_BASE = "https://store.steampowered.com/api";
const STEAM_WEB_API_BASE = "https://api.steampowered.com";

export type SteamAppDetails = {
    appId: number;
    name: string;
    headerImage?: string;
    shortDescription?: string;
    steamUrl: string;
};

export type SteamGlobalAchievement = {
    name: string;
    percent: number;
};

// Detalhes do app na Steam Store (nome, imagem, descrição...)
export async function getSteamAppDetails(
    appId: number,
    options?: { lang?: string; country?: string }
): Promise<SteamAppDetails | null> {
    const lang = options?.lang ?? "portuguese";
    const country = options?.country ?? "br";

    const url = `${STEAM_STORE_BASE}/appdetails?appids=${appId}&cc=${country}&l=${lang}`;

    const res = await fetch(url, {
        // cacheia por 6h pra não bater rate limit à toa
        next: { revalidate: 60 * 60 * 6 },
    });

    if (!res.ok) {
        logError("Erro ao buscar detalhes da Steam:", res.status, res.statusText);
        return null;
    }

    const json = await res.json();
    const key = String(appId);
    const entry = json[key];

    if (!entry?.success) {
        return null;
    }

    const data = entry.data;

    return {
        appId,
        name: data?.name ?? `App ${appId}`,
        headerImage: data?.header_image,
        shortDescription: data?.short_description,
        steamUrl: `https://store.steampowered.com/app/${appId}`,
    };
}

// Conquistas globais (% de jogadores que pegaram cada uma)

export async function getGlobalAchievements(
    appId: number
): Promise<SteamGlobalAchievement[]> {
    const url = `${STEAM_WEB_API_BASE}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}&format=json`;

    const res = await fetch(url, {
        next: { revalidate: 60 * 60 * 6 },
    });

    if (!res.ok) {
        logError(
            "Erro ao buscar conquistas globais da Steam:",
            res.status,
            res.statusText
        );
        return [];
    }

    const json = await res.json();
    const raw = json?.achievementpercentages?.achievements ?? [];

    // Garante que percent é sempre número
    return raw.map((item: any) => ({
        name: String(item.name),
        percent: Number(item.percent) || 0,
    })) as SteamGlobalAchievement[];
}

