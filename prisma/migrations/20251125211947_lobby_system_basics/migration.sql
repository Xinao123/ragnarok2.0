/*
  Warnings:

  - A unique constraint covering the columns `[lobbyId,userId]` on the table `LobbyMember` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ONLINE';

-- CreateIndex
CREATE INDEX "Lobby_status_gameId_createdAt_idx" ON "Lobby"("status", "gameId", "createdAt");

-- CreateIndex
CREATE INDEX "Lobby_ownerId_idx" ON "Lobby"("ownerId");

-- CreateIndex
CREATE INDEX "LobbyMember_lobbyId_idx" ON "LobbyMember"("lobbyId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyMember_lobbyId_userId_key" ON "LobbyMember"("lobbyId", "userId");
