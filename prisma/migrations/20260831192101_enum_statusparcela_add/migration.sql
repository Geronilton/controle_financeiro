/*
  Warnings:

  - You are about to drop the column `saldo` on the `conta_financeira` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusParcela" AS ENUM ('PENDENTE', 'PAGO');

-- AlterTable
ALTER TABLE "conta_financeira" DROP COLUMN "saldo";
