/*
  Warnings:

  - You are about to drop the `participante_lancamento` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[usuarioId,nome]` on the table `participante` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "participante_lancamento" DROP CONSTRAINT "participante_lancamento_lancamentoId_fkey";

-- DropForeignKey
ALTER TABLE "participante_lancamento" DROP CONSTRAINT "participante_lancamento_participanteId_fkey";

-- AlterTable
ALTER TABLE "lancamento" ADD COLUMN     "participanteId" INTEGER;

-- DropTable
DROP TABLE "participante_lancamento";

-- CreateIndex
CREATE UNIQUE INDEX "participante_usuarioId_nome_key" ON "participante"("usuarioId", "nome");

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
