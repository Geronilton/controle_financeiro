-- CreateEnum
CREATE TYPE "Periodicidade" AS ENUM ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('ENTRADA', 'SAIDA');

-- CreateEnum
CREATE TYPE "StatusLancamento" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoPagamento" AS ENUM ('PIX', 'DINHEIRO', 'CARTAO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "OrigemLancamento" AS ENUM ('MANUAL', 'RECORRENCIA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoLancamento",
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamento" (
    "id" SERIAL NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "valorPago" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tipo" "TipoLancamento" NOT NULL,
    "status" "StatusLancamento" NOT NULL,
    "formaPagamento" "TipoPagamento",
    "dataLancamento" TIMESTAMP(3) NOT NULL,
    "dataVencimento" TIMESTAMP(3),
    "observacao" TEXT,
    "origem" "OrigemLancamento" NOT NULL DEFAULT 'MANUAL',
    "periodicidade" "Periodicidade",
    "quantidadeParcelas" INTEGER NOT NULL DEFAULT 1,
    "contaFinanceiraId" INTEGER,
    "usuarioId" INTEGER NOT NULL,
    "categoriaId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcela" (
    "id" SERIAL NOT NULL,
    "lancamentoId" INTEGER NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "valorParcela" DECIMAL(10,2) NOT NULL,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "status" "StatusLancamento" NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "telefone" TEXT,
    "observacao" TEXT,
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante_lancamento" (
    "id" SERIAL NOT NULL,
    "participanteId" INTEGER NOT NULL,
    "lancamentoId" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "pago" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participante_lancamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conta_financeira" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "objetivo" DECIMAL(10,2),
    "usuarioId" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "conta_financeira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "categoria_usuarioId_idx" ON "categoria"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_usuarioId_nome_key" ON "categoria"("usuarioId", "nome");

-- CreateIndex
CREATE INDEX "lancamento_usuarioId_idx" ON "lancamento"("usuarioId");

-- CreateIndex
CREATE INDEX "lancamento_status_idx" ON "lancamento"("status");

-- CreateIndex
CREATE INDEX "lancamento_dataLancamento_idx" ON "lancamento"("dataLancamento");

-- CreateIndex
CREATE INDEX "lancamento_categoriaId_idx" ON "lancamento"("categoriaId");

-- CreateIndex
CREATE INDEX "parcela_lancamentoId_idx" ON "parcela"("lancamentoId");

-- CreateIndex
CREATE INDEX "parcela_status_idx" ON "parcela"("status");

-- CreateIndex
CREATE INDEX "parcela_vencimento_idx" ON "parcela"("vencimento");

-- CreateIndex
CREATE INDEX "participante_usuarioId_idx" ON "participante"("usuarioId");

-- CreateIndex
CREATE INDEX "conta_financeira_usuarioId_idx" ON "conta_financeira"("usuarioId");

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_contaFinanceiraId_fkey" FOREIGN KEY ("contaFinanceiraId") REFERENCES "conta_financeira"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamento" ADD CONSTRAINT "lancamento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcela" ADD CONSTRAINT "parcela_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante" ADD CONSTRAINT "participante_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_lancamento" ADD CONSTRAINT "participante_lancamento_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_lancamento" ADD CONSTRAINT "participante_lancamento_lancamentoId_fkey" FOREIGN KEY ("lancamentoId") REFERENCES "lancamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta_financeira" ADD CONSTRAINT "conta_financeira_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
