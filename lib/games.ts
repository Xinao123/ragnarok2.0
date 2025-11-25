import { prisma } from "@/lib/prisma";
import { getGameById, type RawgGame } from "@/lib/rawg";

function mapRawgToGameData(rawg: RawgGame) {
  const platformName =
    rawg.parent_platforms?.[0]?.platform?.name ??
    rawg.platforms?.[0]?.platform?.name ??
    "Multi";

  const firstGenre = rawg.genres?.[0]?.name ?? null;

  return {
    name: rawg.name,
    slug: rawg.slug,
    platform: platformName,
    genre: firstGenre,
    rawgId: rawg.id,
    backgroundImageUrl: rawg.background_image,
  };
}

/**
 * Importa um jogo da RAWG pelo ID numérico e salva/atualiza no banco.
 * - Se já existir por rawgId, retorna o existente
 * - Se existir por slug, atualiza pra anexar rawgId/imagem
 * - Se não existir, cria um novo Game
 */
export async function importGameFromRawg(rawgId: number) {
  if (!rawgId || Number.isNaN(rawgId)) {
    throw new Error("rawgId inválido.");
  }

  // Já existe com esse rawgId?
  const existingByRawg = await prisma.game.findFirst({
    where: { rawgId },
  });

  if (existingByRawg) {
    return existingByRawg;
  }

  // Busca detalhes na RAWG
  const rawg = await getGameById(rawgId);
  const data = mapRawgToGameData(rawg);

  // Já existe um game com o mesmo slug?
  const existingBySlug = await prisma.game.findUnique({
    where: { slug: data.slug },
  });

  if (existingBySlug) {
    // Atualiza para anexar rawgId + imagem
    return prisma.game.update({
      where: { id: existingBySlug.id },
      data: {
        rawgId: data.rawgId,
        backgroundImageUrl: data.backgroundImageUrl,
        platform: data.platform,
        genre: data.genre,
      },
    });
  }

  // Cria novo Game
  return prisma.game.create({
    data,
  });
}
