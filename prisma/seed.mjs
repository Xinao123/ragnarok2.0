import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco Ragnarok...");

  // 1) Garantir alguns games base
  const gamesData = [
    {
      name: "Valorant",
      slug: "valorant",
      platform: "PC",
      genre: "FPS",
    },
    {
      name: "Counter-Strike 2",
      slug: "cs2",
      platform: "PC",
      genre: "FPS",
    },
    {
      name: "League of Legends",
      slug: "league-of-legends",
      platform: "PC",
      genre: "MOBA",
    },
    {
      name: "Fortnite",
      slug: "fortnite",
      platform: "Multi",
      genre: "Battle Royale",
    },
  ];

  const games = [];
  for (const game of gamesData) {
    const g = await prisma.game.upsert({
      where: { slug: game.slug },
      update: game,
      create: game,
    });
    games.push(g);
  }

  console.log(`✅ Games prontos: ${games.length}`);

  // 2) Criar um usuário fake (dona Cabritinha gamer 😎)
  const user = await prisma.user.upsert({
    where: { email: "yasmin@example.com" },
    update: {},
    create: {
      email: "yasmin@example.com",
      name: "Yasmin",
      username: "cabritinha",
      avatarUrl: null,
      bio: "Main support, tilt fácil, mas gente boa.",
    },
  });

  console.log(`✅ Usuário padrão: ${user.email}`);

  // 3) Criar alguns lobbies fake
  const valorant = games.find((g) => g.slug === "valorant");
  const cs2 = games.find((g) => g.slug === "cs2");
  const lol = games.find((g) => g.slug === "league-of-legends");

  if (!valorant || !cs2 || !lol) {
    throw new Error("Algum game esperado não foi encontrado no seed.");
  }

  // Limpar lobbies antigos (dev only)
  await prisma.chatMessage.deleteMany();
  await prisma.lobbyMember.deleteMany();
  await prisma.lobby.deleteMany();

  const lobby1 = await prisma.lobby.create({
    data: {
      title: "Ranqueada séria, sem tilt",
      description: "Buscando time focado, comunicação em PT-BR.",
      status: "OPEN",
      maxPlayers: 5,
      language: "pt-BR",
      region: "BR",
      gameId: valorant.id,
      ownerId: user.id,
    },
  });

  const lobby2 = await prisma.lobby.create({
    data: {
      title: "CS2 mixzinho tryhard",
      description: "Preciso de entry fragger e AWP bom.",
      status: "OPEN",
      maxPlayers: 5,
      language: "pt-BR",
      region: "BR",
      gameId: cs2.id,
      ownerId: user.id,
    },
  });

  const lobby3 = await prisma.lobby.create({
    data: {
      title: "LOL flex casual",
      description: "Jogando de boa, sem pressão, só diversão.",
      status: "OPEN",
      maxPlayers: 5,
      language: "pt-BR",
      region: "BR",
      gameId: lol.id,
      ownerId: user.id,
    },
  });

  // 4) Colocar a dona do lobby como membro líder
  const lobbies = [lobby1, lobby2, lobby3];

  for (const lobby of lobbies) {
    await prisma.lobbyMember.create({
      data: {
        lobbyId: lobby.id,
        userId: user.id,
        role: "LEADER",
        status: "ACTIVE",
      },
    });
  }

  console.log(`✅ Lobbies criados: ${lobbies.length}`);
  console.log("🌱 Seed concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

