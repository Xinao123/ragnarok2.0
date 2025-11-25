/*
  Warnings:

  - A unique constraint covering the columns `[rawgId]` on the table `Game` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "backgroundImageUrl" TEXT,
ADD COLUMN     "rawgId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Game_rawgId_key" ON "Game"("rawgId");
