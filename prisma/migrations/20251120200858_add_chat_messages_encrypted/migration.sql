/*
  Warnings:

  - You are about to drop the column `content` on the `ChatMessage` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `ChatMessage` table. All the data in the column will be lost.
  - Added the required column `authTag` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ciphertext` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromUserId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_lobbyId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_userId_fkey";

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "content",
DROP COLUMN "userId",
ADD COLUMN     "algorithm" TEXT NOT NULL DEFAULT 'AES-256-GCM',
ADD COLUMN     "authTag" BYTEA NOT NULL,
ADD COLUMN     "ciphertext" BYTEA NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "fromUserId" TEXT NOT NULL,
ADD COLUMN     "iv" BYTEA NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_lobbyId_createdAt_idx" ON "ChatMessage"("lobbyId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_fromUserId_createdAt_idx" ON "ChatMessage"("fromUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
