/*
  Warnings:

  - A unique constraint covering the columns `[recorrenciaId,dataVencimento]` on the table `lancamento` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "lancamento_recorrenciaId_dataVencimento_key" ON "lancamento"("recorrenciaId", "dataVencimento");
