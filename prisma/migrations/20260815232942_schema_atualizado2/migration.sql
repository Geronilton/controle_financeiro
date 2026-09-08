-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('USUARIO', 'ADMIN');

-- AlterEnum
ALTER TYPE "StatusLancamento" ADD VALUE 'PAUSADO';

-- AlterTable
ALTER TABLE "lancamento" ADD COLUMN     "recorrenciaId" INTEGER;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "tipo" "TipoUsuario" NOT NULL DEFAULT 'USUARIO';

-- CreateTable
CREATE TABLE "recorrencia" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "TipoLancamento" NOT NULL,
    "formaPagamento" "TipoPagamento",
    "periodicidade" "Periodicidade" NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusLancamento" NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "categoriaId" INTEGER,
    "contaFinanceiraId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recorrencia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_recorrenciaId_fkey" FOREIGN KEY ("recorrenciaId") REFERENCES "recorrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia" ADD CONSTRAINT "recorrencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia" ADD CONSTRAINT "recorrencia_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recorrencia" ADD CONSTRAINT "recorrencia_contaFinanceiraId_fkey" FOREIGN KEY ("contaFinanceiraId") REFERENCES "conta_financeira"("id") ON DELETE SET NULL ON UPDATE CASCADE;
