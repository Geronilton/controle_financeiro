-- AlterTable
ALTER TABLE "conta_financeira" ADD COLUMN     "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lancamento" ADD COLUMN     "dataPagamento" TIMESTAMP(3);
